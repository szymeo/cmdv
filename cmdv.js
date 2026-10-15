// cmdv: paste images into LinkedIn posts, comments and messages with cmd+V.
//
// LinkedIn takes images only through its photo button, which opens a file dialog. On a paste that holds images,
// cmdv presses that button itself and, when LinkedIn opens the dialog, hands it the pasted images instead.
// It runs in the page's own world (manifest: "world": "MAIN") so it can stand in for the dialog.
(() => {
  // The aria-labels of LinkedIn's photo buttons: "Add media", "Add a photo", "Attach an image to your conversation".
  const PHOTO = /photo|image|media|picture/i;
  // How far up from the editor to look for its photo button: the composer, never the whole feed.
  const DEPTH = 12;
  // Images wait this long for LinkedIn to ask for them.
  const WAIT_MS = 5000;

  let pending = null; // { files, until }

  /** Gives the pasted images to a file input as if picked in the dialog. False if none are waiting or it takes none. */
  function give(input) {
    if (!pending || Date.now() > pending.until || input.type !== 'file') return false;
    const accept = input.accept.trim();
    if (accept && !/image/.test(accept)) return false;
    const dt = new DataTransfer();
    for (const file of input.multiple ? pending.files : pending.files.slice(0, 1)) dt.items.add(file);
    pending = null;
    input.files = dt.files;
    // A real dialog answers after click() returns: so does this.
    setTimeout(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return true;
  }

  // LinkedIn opens the dialog with click() (or showPicker()) on a file input, often one never put in the page.
  for (const name of ['click', 'showPicker']) {
    const original = HTMLInputElement.prototype[name];
    if (!original) continue;
    HTMLInputElement.prototype[name] = function (...args) {
      if (!give(this)) return original.apply(this, args);
    };
  }

  /** The editor's own file input or photo button: the nearest one, searched outward from the editor. */
  function target(editor) {
    let scope = editor;
    for (let i = 0; i < DEPTH && scope; i++, scope = scope.parentElement) {
      const input = [...scope.querySelectorAll('input[type="file"]')].find(takesImages);
      if (input) return input;
      const button = [...scope.querySelectorAll('button')].find((b) => !b.disabled && PHOTO.test(label(b)));
      if (button) return button;
      if (scope.matches('[role="dialog"], form')) break;
    }
    return null;
  }

  const label = (el) => el.getAttribute('aria-label') ?? el.title ?? '';
  const takesImages = (input) => !input.accept || /image/.test(input.accept);

  /** Rich text (from Word, a web page) can carry a picture of itself: that paste stays text. */
  function isText(data) {
    const html = data.getData('text/html');
    return !!html && !!new DOMParser().parseFromString(html, 'text/html').body.textContent.trim();
  }

  document.addEventListener(
    'paste',
    (e) => {
      const editor = e.target instanceof Element && e.target.closest('[contenteditable="true"], textarea');
      const data = e.clipboardData;
      if (!editor || !data) return;
      const files = [...data.files].filter((f) => f.type.startsWith('image/'));
      if (!files.length || isText(data)) return;

      const hit = target(editor);
      if (!hit) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      pending = { files, until: Date.now() + WAIT_MS };
      if (hit instanceof HTMLInputElement) return void give(hit);
      hit.click();
      // Some photo buttons open LinkedIn's media editor, which keeps its file input in the page: give it there.
      setTimeout(() => {
        const inputs = [...document.querySelectorAll('input[type="file"]')].filter(takesImages);
        if (pending && inputs.length) give(inputs.at(-1));
      }, 300);
    },
    true,
  );
})();
