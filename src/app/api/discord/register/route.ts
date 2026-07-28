import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { NextResponse } from 'next/server';
import { getSystemSetting } from '@/lib/settings';

export async function GET(req: Request) {
  return registerCommands();
}

export async function POST(req: Request) {
  return registerCommands();
}

async function registerCommands() {
  try {
    const botToken = await getSystemSetting('DISCORD_BOT_TOKEN');
    const clientId = await getSystemSetting('DISCORD_CLIENT_ID');

    if (!botToken || !clientId) {
      return NextResponse.json({ error: 'DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID is not configured in settings.' }, { status: 400 });
    }

    const commands = [
      new SlashCommandBuilder().setName('tasks').setDescription('List your pending tasks'),
      new SlashCommandBuilder()
        .setName('pair')
        .setDescription('Pair your Discord account with MindSpace')
        .addStringOption((opt) => opt.setName('code').setDescription('6-digit pairing code from Settings').setRequired(true)),
      new SlashCommandBuilder()
        .setName('task')
        .setDescription('Manage tasks')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a new macro or micro task')
            .addStringOption((opt) => opt.setName('title').setDescription('Task title').setRequired(true))
            .addStringOption((opt) => opt.setName('due').setDescription('Due date (e.g. tomorrow, 1h, next week)'))
            .addStringOption((opt) =>
              opt
                .setName('priority')
                .setDescription('Priority')
                .addChoices(
                  { name: 'Low', value: 'LOW' },
                  { name: 'Medium', value: 'MEDIUM' },
                  { name: 'High', value: 'HIGH' },
                  { name: 'Critical', value: 'CRITICAL' }
                )
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('done')
            .setDescription('Mark a task as completed')
            .addStringOption((opt) => opt.setName('id').setDescription('Task ID').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('snooze')
            .setDescription('Snooze a task deadline')
            .addStringOption((opt) => opt.setName('id').setDescription('Task ID').setRequired(true))
            .addStringOption((opt) => opt.setName('time').setDescription('Time offset/phrase (e.g. 1h, tomorrow)').setRequired(true))
        ),
      new SlashCommandBuilder().setName('reminders').setDescription('List your upcoming reminders'),
      new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Create a new reminder')
        .addStringOption((opt) => opt.setName('message').setDescription('Reminder details').setRequired(true))
        .addStringOption((opt) => opt.setName('when').setDescription('When to remind (e.g. in 30m, 1h, tomorrow)').setRequired(true)),
      new SlashCommandBuilder()
        .setName('capture')
        .setDescription('Save text to Quick Capture Inbox')
        .addStringOption((opt) => opt.setName('text').setDescription('Text to capture').setRequired(true)),
      new SlashCommandBuilder().setName('digest').setDescription('Request an immediate daily digest briefing'),
    ].map((cmd) => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(botToken);
    
    console.log('[Discord Commands] Refreshing application (/) commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('[Discord Commands] Successfully reloaded application (/) commands.');

    return NextResponse.json({ message: 'Slash commands registered successfully' });
  } catch (error) {
    console.error('[Discord Slash Register Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
