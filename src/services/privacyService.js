/**
 * privacyService.js
 * 
 * Client-side service to redact Personally Identifiable Information (PII)
 * before sending data to external AI providers.
 */

// Regex Patterns for common PII
const PATTERNS = {
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Simple Phone: (123) 456-7890 or 123-456-7890 or 123 456 7890
    PHONE: /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\b/g,
    // IPv4 Address (avoiding version numbers like v1.2.3 by checking boundaries if possible, but keeping simple for POC)
    IPV4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    // SSN (US): 000-00-0000
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
    // Credit Card (Simple check for 13-19 digits, potentially with dashes/spaces)
    CREDIT_CARD: /\b(?:\d[ -]*?){13,19}\b/g
};

/**
 * Redacts PII from the given text based on active patterns.
 * @param {string} text - The raw text input.
 * @returns {string} - The text with PII replaced by [REDACTED_TYPE].
 */
export function redactText(text) {
    if (!text || typeof text !== 'string') return text;

    let redacted = text;

    // 1. Email
    redacted = redacted.replace(PATTERNS.EMAIL, '[REDACTED_EMAIL]');

    // 2. SSN
    redacted = redacted.replace(PATTERNS.SSN, '[REDACTED_SSN]');

    // 3. IPv4 
    // Note: IP regex can be aggressive (e.g. matching version numbers). 
    // We strictly apply it only if it looks clearly like an IP.
    redacted = redacted.replace(PATTERNS.IPV4, (match) => {
        // Simple validation to ensure segments < 256
        const parts = match.split('.').map(Number);
        if (parts.every(p => p >= 0 && p <= 255)) return '[REDACTED_IP]';
        return match;
    });

    // 4. Credit Card (Primitive check to avoid false positives on long numbers)
    // Only redact if it passes Luhn algorithm? For POC, purely Regex is safer/faster but aggressive.
    // Let's stick to a slightly strict regex for groups of 4 digits.
    redacted = redacted.replace(/\b(?:\d{4}[- ]?){3,4}\d{1,4}\b/g, '[REDACTED_CC]');

    // 5. Phone (Careful, this is the most prone to false positives like Dates or IDs)
    // We will use a stricter subset for now:
    // Must have at least one separator `.` or `-` or ` ` to be considered a phone number in text.
    // Or be fully parenthesized area code.
    redacted = redacted.replace(PATTERNS.PHONE, (match) => {
        // If it looks like a date (2024-01-01), skip it
        if (match.match(/^\d{4}-\d{2}-\d{2}$/)) return match;
        // If it's just a small number, skip
        if (match.replace(/\D/g, '').length < 7) return match;

        return '[REDACTED_PHONE]';
    });

    return redacted;
}
