# Founder block (parked)

A section placed right after "how it works". It shows the founder's vertical video message (9:16) with her photo as the poster, a name card, a WhatsApp button, a call link and a transcript. Everything is in Romanian and English.

It was removed from the live page until she agrees. Nothing in it is wired to anything else, so it can come back in one step.

## Put it back

```bash
python3 addons/her-block/add_her_block.py project/Main.dc.html
```

The script stops with an error if any anchor is missing, so it never half-applies.

`Main.with-her-block.dc.html` is the full page with the block already applied (Version 7 content), for reference.

## Fill in her details

In the new `host()` method:

```js
first: '[Prenume]',        // first name
name:  '[Prenume Nume]',   // full name
photo: '',                 // her photo: a /_blob/ url or a data: uri
video: '',                 // her video: mp4, vertical 9:16, under 10 MB
poster: ''                 // optional still. Falls back to the photo
```

Upload the photo and the video as assets of the artifact (Artifact tool, `asset: true`) and paste the returned `/_blob/...` urls.

Three states, no extra work:

- no photo, no video: placeholder frame
- photo only: portrait with her name card
- photo and video: poster plus a play button

## Keep in sync

- The transcript (`hv_tr1` to `hv_tr6` in `dict()`) must match what she says in the video. The script is in `docs/video-script.md`.
- The block assumes a founder based in Bucharest ("Fondatoare, Shine Digital"). Change `hv_role` and `hv_city` if that is wrong.
- The floating WhatsApp pill also hides while this block is on screen, so it cannot cover the video controls.

## Test after applying

```bash
node addons/her-block/tests/her-test.js project/Main.dc.html
node addons/her-block/tests/wa-test.her.js project/Main.dc.html
node addons/her-block/tests/test_i18n.her.js project/Main.dc.html
```

These replace `tests/wa-test.js` and `tests/test_i18n.js` while the block is on the page. `her-test.js` should print only `ok` lines.
