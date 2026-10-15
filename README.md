# cmdv

Paste images into LinkedIn posts, comments and messages with cmd+V (ctrl+V on Windows and Linux).

LinkedIn ignores a pasted image: it takes one only through its photo button and a file dialog.
cmdv makes the paste work: copy a screenshot, an image from a web page or a PNG in Finder, press cmd+V in the editor, and LinkedIn opens it as if you had picked the file.

## Install

For Chrome, Brave, Arc, Edge or any other Chromium browser:

1. Download this repository (Code → Download ZIP) and unzip it, or `git clone` it.
2. Open `chrome://extensions` (`brave://extensions` in Brave).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and pick the folder.

## How it works

On a paste that holds images, cmdv finds the editor's own photo button and presses it.
When LinkedIn then opens the file dialog, cmdv answers it with the pasted images instead.
Text pastes, and rich text that carries a picture of itself (from Word, say), are left alone.

It is one file, [`cmdv.js`](cmdv.js), about 90 lines: read it before you load it.
It asks for no permissions, runs only on `www.linkedin.com`, and sends nothing anywhere.

If LinkedIn renames its photo buttons, the `PHOTO` pattern at the top of `cmdv.js` is the line to change.

## Test

```bash
npm install
npm test
```

It loads cmdv into Chromium, serves a stand-in for LinkedIn's three kinds of composer and pastes into each for real.

## License

MIT
