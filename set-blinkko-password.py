#!/usr/bin/env python3
"""Set, check or remove the password for the Blinkko case-study page.

Run from the project folder:
    python3 set-blinkko-password.py           set a new password (empty = remove the gate)
    python3 set-blinkko-password.py --check   test whether a password matches the stored one

The password itself is never stored. Only its SHA-256 fingerprint is written into
projects/blinkko/index.html.

Note: this is a simple gate for a static site. It keeps casual visitors out, but the
page source and this public repository can still be read by someone technical.
"""
import getpass
import hashlib
import pathlib
import re
import sys

PAGE = pathlib.Path(__file__).resolve().parent / 'projects' / 'blinkko' / 'index.html'
HASH_RE = r"const GATE_HASH = '([0-9a-f]*)';"


def describe(pw):
    kinds = []
    if any(not c.isascii() for c in pw):
        kinds.append('contains non-English characters (check your input method)')
    if pw != pw.strip():
        kinds.append('starts or ends with a space')
    if any(c.isupper() for c in pw):
        kinds.append('contains capital letters')
    return f'{len(pw)} characters' + (', ' + ', '.join(kinds) if kinds else '')


def main():
    html = PAGE.read_text(encoding='utf-8')
    salt = re.search(r"const GATE_SALT = '([^']*)';", html)
    stored = re.search(HASH_RE, html)
    if not salt or not stored:
        sys.exit('Could not find the password gate in ' + str(PAGE))
    digest_of = lambda pw: hashlib.sha256((salt.group(1) + pw).encode('utf-8')).hexdigest()

    if '--check' in sys.argv:
        if not stored.group(1):
            sys.exit('No password is set. The Blinkko page is open.')
        pw = getpass.getpass('Password to check: ')
        ok = digest_of(pw) == stored.group(1)
        print(('MATCH' if ok else 'NO MATCH') + ' - you typed ' + describe(pw) + '.')
        return

    first = getpass.getpass('New password (leave empty to remove the gate): ')
    if first:
        if getpass.getpass('Type it again: ') != first:
            sys.exit('The two passwords did not match. Nothing was changed.')
        digest = digest_of(first)
    else:
        digest = ''

    html = re.sub(HASH_RE, "const GATE_HASH = '" + digest + "';", html, count=1)
    PAGE.write_text(html, encoding='utf-8')
    if digest:
        print('Password set (' + describe(first) + '). The Blinkko page now asks for it.')
    else:
        print('Gate removed. The Blinkko page is open.')


if __name__ == '__main__':
    main()
