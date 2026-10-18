# 23 · Secure the API

## Introduction

This journey has no screen of its own. It is about the server behind Shelfie, and how it turns away anyone who should not be there.

## Keeping strangers out

Here is a browser tab that is not signed in. Opening the shelf address of the API directly gets a short refusal, and no data at all. Next, someone guesses Dad's password ten times. The eleventh try is refused, even with the right password, and the page says Too many tries. Wait ten minutes and try again.

Nia's keypad is guarded too. After five wrong PINs, it locks for five minutes and shows the time left, and even the right PIN is refused until then.

## Keeping data safe

Once Nia is signed in, the server still checks who she is. When she types the address of Review, she is told This part is for grown-ups, with a link back to her shelf. Then she writes an answer full of code-like tags. When she opens the chapter later, it shows up as plain text, and nothing in it ever runs.

## Recap

Things to remember. Changes must come from the app itself, so requests from other sites are refused. Oversized requests and invalid input are turned away, and every sign-in starts a fresh session.
