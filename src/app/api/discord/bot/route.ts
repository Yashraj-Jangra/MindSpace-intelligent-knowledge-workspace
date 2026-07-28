import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma, isDbDisabled } from '@/lib/db';
import { getSystemSetting } from '@/lib/settings';
import { parseSnoozePhrase } from '@/lib/snooze-parser';
import { redis } from '@/lib/redis';

// Verify Ed25519 signature from Discord
function verifyDiscordSignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  rawBody: string
): boolean {
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]),
        Buffer.from(publicKey, 'hex'),
      ]),
      format: 'der',
      type: 'spki',
    });
    
    return crypto.verify(
      undefined,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('[verifyDiscordSignature Error]:', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const isLocalBypass = req.headers.get('x-local-bypass') === 'true';

    if (!isLocalBypass) {
      const publicKey = await getSystemSetting('DISCORD_CLIENT_PUBLIC_KEY') || process.env.DISCORD_PUBLIC_KEY;
      if (!publicKey) {
        console.error('[Discord Bot] Client public key is not configured.');
        return NextResponse.json({ error: 'Discord public key not configured' }, { status: 500 });
      }

      const signature = req.headers.get('x-signature-ed25519') || '';
      const timestamp = req.headers.get('x-signature-timestamp') || '';
      const rawBody = await req.text();

      const isValid = verifyDiscordSignature(publicKey, signature, timestamp, rawBody);
      if (!isValid) {
        console.warn('[Discord Bot] Invalid signature signature received.');
        return new Response('Invalid request signature', { status: 401 });
      }
    }

    const rawBody = isLocalBypass ? await req.text() : '';
    const interaction = isLocalBypass ? JSON.parse(rawBody) : JSON.parse(await req.text());

    // Type 1: Ping (for validation)
    if (interaction.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    const discordUser = interaction.member?.user || interaction.user;
    const discordUserId = discordUser?.id;

    if (!discordUserId) {
      return NextResponse.json({
        type: 4,
        data: { content: 'Could not resolve Discord user ID.' }
      });
    }

    // Lookup paired account
    if (isDbDisabled()) {
      return NextResponse.json({
        type: 4,
        data: { content: 'Database is currently offline. Please try again later.' }
      });
    }

    const discordAccount = await prisma.discordAccount.findUnique({
      where: { discordUserId },
    });

    // Check if paired. If not, check if interaction is a pair command.
    const isPairCommand = interaction.type === 2 && interaction.data.name === 'pair';
    
    if (isPairCommand) {
      const options = interaction.data.options || [];
      const code = options.find((o: any) => o.name === 'code')?.value;

      if (!code) {
        return NextResponse.json({
          type: 4,
          data: {
            flags: 64,
            content: '❌ Please specify the pairing code, e.g., `/pair 123456`.'
          }
        });
      }

      try {
        const { pairDiscordAccount } = require('@/lib/discord/bot');
        const account = await pairDiscordAccount(code, discordUserId, discordUser.username || 'DiscordUser');
        return NextResponse.json({
          type: 4,
          data: {
            content: `✅ **Account successfully paired!**\nWelcome to MindSpace, ${discordUser.username || 'user'}!`
          }
        });
      } catch (err) {
        return NextResponse.json({
          type: 4,
          data: {
            flags: 64,
            content: `❌ **Pairing failed:** ${(err as Error).message}`
          }
        });
      }
    }

    // Also support pairing directly via Discord interaction by letting them pair or showing code instructions
    if (!discordAccount || !discordAccount.isPaired) {
      // If we want to handle pairing code dynamically or prompt user:
      return NextResponse.json({
        type: 4,
        data: {
          flags: 64, // Ephemeral (only sender sees)
          content: `❌ **Your Discord account is not paired with MindSpace.**\nGo to the web app -> settings drawer -> Discord tab, copy your pairing code, and pair your account first.`
        }
      });
    }

    const userId = discordAccount.userId;

    // Type 2: Application Command (Slash Commands)
    if (interaction.type === 2) {
      const commandName = interaction.data.name;

      if (commandName === 'tasks') {
        const tasks = await prisma.task.findMany({
          where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
          orderBy: { priority: 'desc' },
          take: 10,
        });

        if (tasks.length === 0) {
          return NextResponse.json({
            type: 4,
            data: { content: '✅ You have no pending tasks!' }
          });
        }

        const taskLines = tasks.map((t) => {
          const priorityBadge = `\`[${t.priority}]\``;
          const dueStr = t.dueAt ? `(Due: ${new Date(t.dueAt).toLocaleDateString()})` : '';
          return `- **${t.title}** ${priorityBadge} ${dueStr} \`ID: ${t.id}\``;
        }).join('\n');

        return NextResponse.json({
          type: 4,
          data: {
            content: `📋 **Your Pending Tasks (Top 10):**\n\n${taskLines}`
          }
        });
      }

      if (commandName === 'task') {
        const subcommand = interaction.data.options[0].name;
        const options = interaction.data.options[0].options || [];

        if (subcommand === 'add') {
          const title = options.find((o: any) => o.name === 'title')?.value;
          const duePhrase = options.find((o: any) => o.name === 'due')?.value;
          const priority = options.find((o: any) => o.name === 'priority')?.value || 'MEDIUM';

          const dueAt = duePhrase ? parseSnoozePhrase(duePhrase) : null;

          const task = await prisma.task.create({
            data: {
              userId,
              title,
              priority,
              dueAt,
              status: 'TODO',
            },
          });

          // Sync client via Socket.io publish
          await redis.publish('socket-emit', JSON.stringify({
            room: `user:${userId}`,
            event: 'task:updated',
            data: task,
          }));

          return NextResponse.json({
            type: 4,
            data: {
              content: `✨ **Task Created Successfully!**\n- **Title:** ${task.title}\n- **Priority:** \`[${task.priority}]\`\n- **Due:** ${task.dueAt ? task.dueAt.toLocaleString() : 'No deadline'}`
            }
          });
        }

        if (subcommand === 'done') {
          const id = options.find((o: any) => o.name === 'id')?.value;
          
          try {
            const task = await prisma.task.update({
              where: { id, userId },
              data: { status: 'DONE', completedAt: new Date() },
            });

            await redis.publish('socket-emit', JSON.stringify({
              room: `user:${userId}`,
              event: 'task:done',
              data: task,
            }));

            return NextResponse.json({
              type: 4,
              data: { content: `✅ Task **${task.title}** marked as done!` }
            });
          } catch (e) {
            return NextResponse.json({
              type: 4,
              data: { content: `❌ Failed to complete task. Verify task ID: \`${id}\`` }
            });
          }
        }

        if (subcommand === 'snooze') {
          const id = options.find((o: any) => o.name === 'id')?.value;
          const timePhrase = options.find((o: any) => o.name === 'time')?.value;

          const newDue = parseSnoozePhrase(timePhrase);
          if (!newDue) {
            return NextResponse.json({
              type: 4,
              data: { content: `❌ Could not parse snooze offset phrase: \`${timePhrase}\`` }
            });
          }

          try {
            const task = await prisma.task.update({
              where: { id, userId },
              data: { dueAt: newDue },
            });

            await redis.publish('socket-emit', JSON.stringify({
              room: `user:${userId}`,
              event: 'task:updated',
              data: task,
            }));

            return NextResponse.json({
              type: 4,
              data: { content: `💤 Task **${task.title}** snoozed to: ${newDue.toLocaleString()}` }
            });
          } catch (e) {
            return NextResponse.json({
              type: 4,
              data: { content: `❌ Failed to snooze task. Verify task ID: \`${id}\`` }
            });
          }
        }
      }

      if (commandName === 'reminders') {
        const now = new Date();
        const reminders = await prisma.notification.findMany({
          where: { userId, status: 'PENDING', scheduledFor: { gte: now } },
          orderBy: { scheduledFor: 'asc' },
          take: 10,
        });

        if (reminders.length === 0) {
          return NextResponse.json({
            type: 4,
            data: { content: '⏰ No upcoming reminders scheduled.' }
          });
        }

        const reminderLines = reminders.map((r) => {
          return `- **${r.title}** on ${new Date(r.scheduledFor).toLocaleString()} (Status: \`${r.status}\`)`;
        }).join('\n');

        return NextResponse.json({
          type: 4,
          data: { content: `⏰ **Your Upcoming Reminders:**\n\n${reminderLines}` }
        });
      }

      if (commandName === 'remind') {
        const options = interaction.data.options || [];
        const message = options.find((o: any) => o.name === 'message')?.value;
        const whenPhrase = options.find((o: any) => o.name === 'when')?.value;

        const scheduledFor = parseSnoozePhrase(whenPhrase);
        if (!scheduledFor) {
          return NextResponse.json({
            type: 4,
            data: { content: `❌ Could not parse date/time format: \`${whenPhrase}\`` }
          });
        }

        const notif = await prisma.notification.create({
          data: {
            userId,
            title: 'Reminder created from Discord',
            message,
            scheduledFor,
            channels: ['discord', 'in_app'],
          },
        });

        return NextResponse.json({
          type: 4,
          data: { content: `⏰ **Reminder scheduled!**\n- **Msg:** ${message}\n- **Time:** ${scheduledFor.toLocaleString()}` }
        });
      }

      if (commandName === 'capture') {
        const options = interaction.data.options || [];
        const text = options.find((o: any) => o.name === 'text')?.value;

        const capture = await prisma.capture.create({
          data: {
            userId,
            rawText: text,
            status: 'PENDING',
          },
        });

        return NextResponse.json({
          type: 4,
          data: { content: `📥 Saved message to your **Quick Capture Inbox**!` }
        });
      }

      if (commandName === 'digest') {
        const tasks = await prisma.task.findMany({
          where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
          orderBy: { priority: 'desc' },
          take: 5,
        });

        const now = new Date();
        const reminders = await prisma.notification.findMany({
          where: { userId, status: 'PENDING', scheduledFor: { gte: now } },
          orderBy: { scheduledFor: 'asc' },
          take: 5,
        });

        let digestText = `☀️ **MindSpace Briefing:**\n\n📋 **PENDING TASKS:**\n`;
        if (tasks.length === 0) {
          digestText += `  No active tasks.\n`;
        } else {
          tasks.forEach(t => {
            digestText += `  - ${t.title} [${t.priority}]\n`;
          });
        }

        digestText += `\n⏰ **UPCOMING REMINDERS:**\n`;
        if (reminders.length === 0) {
          digestText += `  No active reminders.\n`;
        } else {
          reminders.forEach(r => {
            digestText += `  - ${r.title} on ${new Date(r.scheduledFor).toLocaleString()}\n`;
          });
        }

        return NextResponse.json({
          type: 4,
          data: { content: digestText }
        });
      }
    }

    // Type 3: Message Component (Buttons)
    if (interaction.type === 3) {
      const customId = interaction.data.custom_id;

      if (customId.startsWith('reminder_done:')) {
        const notifId = customId.split(':')[1];
        await prisma.notification.update({
          where: { id: notifId },
          data: { status: 'DISMISSED' },
        });

        return NextResponse.json({
          type: 7, // UPDATE_MESSAGE: edits original message
          data: {
            content: `✅ **Reminder Resolved** (Marked Done)`,
            components: [], // Removes buttons
          }
        });
      }

      if (customId.startsWith('reminder_snooze_1h:')) {
        const notifId = customId.split(':')[1];
        const newDue = new Date(Date.now() + 60 * 60 * 1000);
        
        const originalNotif = await prisma.notification.findUnique({ where: { id: notifId } });
        if (originalNotif) {
          await prisma.notification.create({
            data: {
              userId: originalNotif.userId,
              nodeId: originalNotif.nodeId,
              noteId: originalNotif.noteId,
              taskId: originalNotif.taskId,
              title: originalNotif.title,
              message: originalNotif.message,
              scheduledFor: newDue,
              channels: originalNotif.channels,
            }
          });
          
          await prisma.notification.update({
            where: { id: notifId },
            data: { status: 'DISMISSED' },
          });
        }

        return NextResponse.json({
          type: 7,
          data: {
            content: `💤 **Reminder snoozed for 1 hour** (Rescheduled to ${newDue.toLocaleTimeString()})`,
            components: [],
          }
        });
      }
    }

    return NextResponse.json({
      type: 4,
      data: { content: 'Unsupported interaction type.' }
    });
  } catch (error) {
    console.error('[Discord Bot webhook exception]:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `⚠️ Error occurred: ${(error as Error).message}` }
    });
  }
}
