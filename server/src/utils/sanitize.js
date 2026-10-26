// Text sanitising for user input and AI-generated content (defence in depth:
// the client also renders everything as escaped text, never as HTML).

// Control chars except \t \n \r
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// Bidirectional override characters ("Trojan source" style tricks)
const BIDI_CHARS = /[‪-‮⁦-⁩]/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
// Real HTML tags only. Deliberately does NOT match mail-style "<user@example.com>":
// the tag name must be followed by whitespace, "/" or ">".
const HTML_TAG =
  /<\/?(?:script|style|iframe|object|embed|link|meta|img|svg|math|form|input|button|textarea|select|option|base|body|html|head|title|video|audio|source|canvas|details|summary|a|b|i|u|em|strong|div|span|p|br|hr|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|pre|code|font|center)(?=[\s/>])[^>]*>/gi;

export function sanitizeText(input, { singleLine = false, maxLength } = {}) {
  if (typeof input !== 'string') return '';
  let s = input.normalize('NFKC');
  s = s.replace(CONTROL_CHARS, '').replace(BIDI_CHARS, '');
  // Repeat until stable so nested constructs like "<scr<script>ipt>" collapse fully.
  let previous;
  do {
    previous = s;
    s = s.replace(HTML_COMMENT, '').replace(HTML_TAG, '');
  } while (s !== previous);
  s = singleLine ? s.replace(/\s+/g, ' ') : s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  s = s.trim();
  if (typeof maxLength === 'number' && s.length > maxLength) s = s.slice(0, maxLength).trim();
  return s;
}
