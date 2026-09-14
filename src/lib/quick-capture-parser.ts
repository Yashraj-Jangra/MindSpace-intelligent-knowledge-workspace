export interface ParsedQuickCapture {
  rawText: string;
  cleanText: string;
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  dueDate?: Date;
  tags: string[];
  urls: string[];
  suggestedType: "TASK" | "NOTE" | "WEB_CLIP" | "REMINDER";
}

export function parseQuickCapture(text: string): ParsedQuickCapture {
  if (!text || typeof text !== "string") {
    return {
      rawText: "",
      cleanText: "",
      tags: [],
      urls: [],
      suggestedType: "NOTE",
    };
  }

  let workingText = text.trim();

  // 1. Extract URLs
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls: string[] = [];
  let urlMatch;
  while ((urlMatch = urlRegex.exec(workingText)) !== null) {
    urls.push(urlMatch[1]);
  }

  // 2. Extract Tags (#tag)
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  const tags: string[] = [];
  let tagMatch;
  while ((tagMatch = tagRegex.exec(workingText)) !== null) {
    if (!tags.includes(tagMatch[1].toLowerCase())) {
      tags.push(tagMatch[1].toLowerCase());
    }
  }

  // 3. Extract Priority (!critical, !high, !med, !low, !p0, !p1, etc.)
  let priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;

  const critRegex = /\b!(critical|crit|p0)\b/i;
  const highRegex = /\b!(high|p1)\b/i;
  const medRegex = /\b!(medium|med|p2)\b/i;
  const lowRegex = /\b!(low|p3)\b/i;

  if (critRegex.test(workingText)) {
    priority = "CRITICAL";
    workingText = workingText.replace(critRegex, "").trim();
  } else if (highRegex.test(workingText)) {
    priority = "HIGH";
    workingText = workingText.replace(highRegex, "").trim();
  } else if (medRegex.test(workingText)) {
    priority = "MEDIUM";
    workingText = workingText.replace(medRegex, "").trim();
  } else if (lowRegex.test(workingText)) {
    priority = "LOW";
    workingText = workingText.replace(lowRegex, "").trim();
  }

  // 4. Extract Dates & Times (tomorrow, today 4pm, next monday, in 2h, etc.)
  let dueDate: Date | undefined;
  const now = new Date();

  // "tomorrow at 4pm" / "tomorrow 4pm" / "tomorrow 16:00" / "tomorrow"
  const tomorrowTimeRegex =
    /\b(?:due\s+)?tomorrow(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/i;
  const tomorrowMatch = workingText.match(tomorrowTimeRegex);
  if (tomorrowMatch) {
    const target = new Date();
    target.setDate(now.getDate() + 1);
    let hours = 9;
    let mins = 0;

    if (tomorrowMatch[1]) {
      hours = parseInt(tomorrowMatch[1], 10);
      const isPm = tomorrowMatch[3]?.toLowerCase() === "pm";
      const isAm = tomorrowMatch[3]?.toLowerCase() === "am";
      if (isPm && hours < 12) hours += 12;
      if (isAm && hours === 12) hours = 0;
      if (tomorrowMatch[2]) mins = parseInt(tomorrowMatch[2], 10);
    }
    target.setHours(hours, mins, 0, 0);
    dueDate = target;
    workingText = workingText.replace(tomorrowTimeRegex, "").trim();
  }

  // "today at 4pm" / "today 4pm" / "tonight"
  if (!dueDate) {
    const todayTimeRegex =
      /\b(?:due\s+)?today(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/i;
    const todayMatch = workingText.match(todayTimeRegex);
    if (todayMatch) {
      const target = new Date();
      let hours = 18;
      let mins = 0;

      if (todayMatch[1]) {
        hours = parseInt(todayMatch[1], 10);
        const isPm = todayMatch[3]?.toLowerCase() === "pm";
        const isAm = todayMatch[3]?.toLowerCase() === "am";
        if (isPm && hours < 12) hours += 12;
        if (isAm && hours === 12) hours = 0;
        if (todayMatch[2]) mins = parseInt(todayMatch[2], 10);
      }
      target.setHours(hours, mins, 0, 0);
      dueDate = target;
      workingText = workingText.replace(todayTimeRegex, "").trim();
    }
  }

  // "in X hours" / "in X mins" / "in X days"
  if (!dueDate) {
    const inTimeRegex =
      /\bin\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\b/i;
    const inMatch = workingText.match(inTimeRegex);
    if (inMatch) {
      const num = parseInt(inMatch[1], 10);
      const unit = inMatch[2].toLowerCase();
      if (unit.startsWith("m")) {
        dueDate = new Date(now.getTime() + num * 60 * 1000);
      } else if (unit.startsWith("h")) {
        dueDate = new Date(now.getTime() + num * 60 * 60 * 1000);
      } else if (unit.startsWith("d")) {
        dueDate = new Date(now.getTime() + num * 24 * 60 * 60 * 1000);
      }
      workingText = workingText.replace(inTimeRegex, "").trim();
    }
  }

  // 5. Clean text cleanup (collapse extra whitespace)
  const cleanText = workingText.replace(/\s+/g, " ").trim();

  // 6. Determine suggested type
  let suggestedType: "TASK" | "NOTE" | "WEB_CLIP" | "REMINDER" = "NOTE";
  if (urls.length > 0 && cleanText.length < 50) {
    suggestedType = "WEB_CLIP";
  } else if (priority || (dueDate && dueDate > now)) {
    suggestedType = "TASK";
  }

  return {
    rawText: text,
    cleanText: cleanText || text,
    priority,
    dueDate,
    tags,
    urls,
    suggestedType,
  };
}
