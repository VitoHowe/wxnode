const fs = require("fs");
const path = require("path");

const filePath =
  "e:\\personal\\wx\\wxnode\\public\\markdown-docs\\1\\chapters\\chapter-01.md";
const content = fs.readFileSync(filePath, "utf8");

const lines = content.split("\n");
let chapterTitle = "";
const questions = [];

let currentQuestion = null;
let buffer = [];

// Helper to process a question block
function processQuestionBlock(blockLines, title) {
  if (blockLines.length === 0) return;

  const fullText = blockLines.join("\n");

  // Extract Question Number and Content
  // Regex to match "1、..." at start
  const match = fullText.match(
    /^(\d+)、([\s\S]*?)(?=\n\s*（?\d?）?[A-D]\.|\n\s*【答案】|\n\s*<table>|$)/,
  );
  if (!match) return; // Should not happen if split correctly

  const qNum = match[1];
  let qContent = match[2].trim();

  // Extract Options
  // Options usually start with (1) A. or A.
  // We need to capture the part between Content and Answer
  const optionsStartIndex = match[0].length;
  const answerMatch = fullText.match(/\n\s*【答案】/);
  const answerStartIndex = answerMatch ? answerMatch.index : fullText.length;

  const optionsText = fullText
    .substring(optionsStartIndex, answerStartIndex)
    .trim();

  // Extract Answer
  let answer = "";
  if (answerMatch) {
    const explanationMatch = fullText.match(/\n\s*【解析】/);
    const answerEndIndex = explanationMatch
      ? explanationMatch.index
      : fullText.length;
    answer = fullText
      .substring(answerStartIndex + match[0].length, answerEndIndex)
      .replace(/【答案】/, "")
      .trim();
    // Sometimes answer is like "CB" or "A" or "A,B"
  }

  // Extract Explanation
  let explanation = "";
  const explanationMatch = fullText.match(/\n\s*【解析】/);
  if (explanationMatch) {
    explanation = fullText
      .substring(explanationMatch.index)
      .replace(/【解析】/, "")
      .trim();
  }

  // Handle Images in Content/Explanation
  // Replace ![](images/...) with ${images/...}
  qContent = qContent.replace(/!\[.*?\]\((images\/.*?)\)/g, "${$1}");
  explanation = explanation.replace(/!\[.*?\]\((images\/.*?)\)/g, "${$1}");

  // Detect Sub-questions
  // If answer has multiple letters like "CB" (and not comma separated) AND options have (1) (2)
  // Or if options have (1) (2) structure.

  const isMultiPart =
    /\(\d+\)/.test(optionsText) && /^[A-Z]+$/.test(answer) && answer.length > 1;

  if (isMultiPart) {
    // Split into sub-questions
    const subAnswers = answer.split("");
    // Split options by (1), (2), etc.
    // Regex to find (1) A... (2) A...
    const optionParts = optionsText
      .split(/\n\s*(?=\(\d+\))/)
      .filter((p) => p.trim());

    subAnswers.forEach((subAns, idx) => {
      const subOptText = optionParts[idx] || "";
      // Clean up subOptText: remove (1)
      const cleanSubOptText = subOptText.replace(/^\(\d+\)/, "").trim();
      const opts = parseOptions(cleanSubOptText);

      questions.push({
        question: `${qNum}-${idx + 1}`,
        type: "single", // Assuming single choice for sub-questions like "CB"
        content: qContent + ` (第${idx + 1}小题)`, // Append context
        options: opts,
        answer: subAns,
        explanation: explanation, // Shared explanation
        difficulty: 1,
        tags: [title],
      });
    });
  } else {
    // Single question
    const opts = parseOptions(optionsText);

    // Determine type
    let type = "single";
    if (answer.includes(",") || answer.length > 1) {
      // Check if it's multiple choice (A,B) or just single choice with multiple letters (unlikely unless sub-questions, which we handled, OR multiple correct answers)
      // If answer is "A,B", it's multiple.
      // If answer is "AB" and we didn't split, it might be multiple.
      // But usually "AB" means A and B are correct (Multiple Choice).
      // Wait, earlier I assumed "CB" was sub-questions.
      // Let's check if options have (1).
      if (!/\(\d+\)/.test(optionsText)) {
        type = "multiple";
      }
    }
    if (answer.includes("正确") || answer.includes("错误")) {
      type = "judge";
    }
    // If no options, it's fill or essay
    if (opts.length === 0) {
      type = "essay"; // or fill
    }

    questions.push({
      question: qNum,
      type: type,
      content: qContent,
      options: opts,
      answer: answer,
      explanation: explanation,
      difficulty: 1,
      tags: [title],
    });
  }
}

function parseOptions(text) {
  // Split by A. B. C. D.
  // Regex lookahead
  // Handle "A. xxx B. xxx" on same line or different lines
  // Normalize newlines
  const normalized = text.replace(/\n/g, "  ");
  // Regex to match A. ... B. ...
  // This is tricky. Let's try to split by [A-Z]\.
  // But we need to keep the letter to know which is which?
  // Or just assume order A, B, C, D.

  // Simple split if they are clearly separated
  // Try to match "A. value"
  const matches = normalized.match(/([A-Z]\.\s*[^A-Z\.]+(?=[A-Z]\.|$))/g);
  if (matches) {
    return matches.map((m) => m.replace(/^[A-Z]\.\s*/, "").trim());
  }

  // Fallback: split by newline if they look like options
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[A-Z]\./.test(l));
  if (lines.length > 0) {
    return lines.map((l) => l.replace(/^[A-Z]\.\s*/, "").trim());
  }

  return [];
}

// Main loop
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.startsWith("# 第")) {
    chapterTitle = line.replace("# ", "").trim();
    continue;
  }

  // Start of a question
  if (/^\d+、/.test(line)) {
    if (buffer.length > 0) {
      processQuestionBlock(buffer, chapterTitle);
    }
    buffer = [line];
  } else {
    if (buffer.length > 0) {
      buffer.push(line);
    }
  }
}
// Process last buffer
if (buffer.length > 0) {
  processQuestionBlock(buffer, chapterTitle);
}

// Output
console.log(JSON.stringify({ questions }, null, 2));
