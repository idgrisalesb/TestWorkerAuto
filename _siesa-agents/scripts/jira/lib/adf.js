/**
 * Atlassian Document Format (ADF) helpers.
 * Jira Cloud REST API v3 requires description/comments in ADF, not markdown.
 */

/** Wrap plain text in an ADF paragraph */
function paragraph(text) {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

/** ADF heading (level 1-6) */
function heading(text, level = 2) {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] }
}

/** ADF bullet list from array of strings */
function bulletList(items) {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraph(item)],
    })),
  }
}

/** ADF ordered list from array of strings */
function orderedList(items) {
  return {
    type: 'orderedList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraph(item)],
    })),
  }
}

/** Wrap content array in a full ADF document */
function doc(contentArray) {
  return { type: 'doc', version: 1, content: contentArray }
}

/**
 * Convert simple markdown-ish text to ADF doc.
 * Handles: ## headings, - bullet lists, numbered lists, plain paragraphs.
 * Not a full markdown parser — covers what story/epic descriptions typically use.
 */
function markdownToAdf(text) {
  // CLI args may pass \n as literal two-char sequence — normalize to real newlines
  const normalized = text.replace(/\\n/g, '\n')
  const lines = normalized.split('\n')
  const content = []
  let currentBullets = []
  let currentOrdered = []

  function flushBullets() {
    if (currentBullets.length) { content.push(bulletList(currentBullets)); currentBullets = [] }
  }
  function flushOrdered() {
    if (currentOrdered.length) { content.push(orderedList(currentOrdered)); currentOrdered = [] }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { flushBullets(); flushOrdered(); continue }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushBullets(); flushOrdered()
      content.push(heading(headingMatch[2], headingMatch[1].length))
      continue
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) { flushOrdered(); currentBullets.push(bulletMatch[1]); continue }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (orderedMatch) { flushBullets(); currentOrdered.push(orderedMatch[1]); continue }

    flushBullets(); flushOrdered()
    content.push(paragraph(trimmed))
  }

  flushBullets(); flushOrdered()
  return doc(content)
}

module.exports = { doc, paragraph, heading, bulletList, orderedList, markdownToAdf }
