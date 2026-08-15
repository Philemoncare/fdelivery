const fs = require('fs');
const f = 'C:/Users/PC/Downloads/omnimarket-&-delivery-platform/server.ts';
let s = fs.readFileSync(f, 'utf8');
const before = s;
let changes = [];

function rep(oldStr, newStr) {
  if (s.includes(oldStr)) {
    s = s.split(oldStr).join(newStr);
    changes.push(oldStr.slice(0, 90));
  } else {
    changes.push('MISS: ' + oldStr.slice(0, 90));
  }
}

// requireReAuth: use verifyPassword
rep(
  'const ok = verifyPassword(stored, password);',
  'const ok = verifyPassword(stored, password);'
);

fs.writeFileSync(f, s, 'utf8');
console.log('CHANGES:');
changes.forEach((c, i) => console.log(i + ': ' + c));
console.log('SAME=' + (before === s));
