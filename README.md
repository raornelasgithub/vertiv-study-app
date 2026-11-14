# Thermal Tech Study - Vertiv / Liebert Level 1 Exam Prep

A free study app for the Vertiv / Liebert Level 1 Thermal Management Technician exam (25 questions, 60 minutes, multiple choice, open book). It works on iPhone and on Windows browsers, you can install it on the iPhone Home Screen, and it works offline after the first visit.

> **Disclaimer:** This is an independent study aid. It is not made or endorsed by Vertiv. The questions are original practice questions written from public documents and general HVAC principles. They are **not** real exam questions.

## What's inside

| Section | What it does |
|---|---|
| **Practice Questions** | One question at a time, explanation right after you answer, filters by topic / difficulty / missed / bookmarked / flagged |
| **Take Practice Exam** | 25 random questions spread across all topics, 60-minute timer, auto-submits, full results and review, history saved |
| **Study Topics** | 9 study guides: refrigeration, compressors & unloading, airflow, electrical & safety, iCOM controls, humidity & reheat, equipment, PM, troubleshooting |
| **Troubleshooting Practice** | 14 step-by-step service-call scenarios |
| **Reference Library** | Searchable list of 45 manuals and documents, plus a search of all study notes |

There are 186 questions (54 basic, 103 intermediate, 29 advanced). Every question shows its source and a confidence label: *Verified in source*, *General technical principle*, or *Model-specific*.

---

## Files (what each one is)

```
vertiv-study-app/
  index.html                  the app page (no need to edit)
  styles.css                  colors and layout (no need to edit)
  app.js                      app logic (no need to edit)
  manifest.json               makes it installable as an app
  service-worker.js           makes it work offline
  data/questions.json         <- QUESTIONS (edit this to add questions)
  data/topics.json            <- STUDY NOTES
  data/scenarios.json         <- TROUBLESHOOTING SCENARIOS
  data/references.json        <- REFERENCE LIBRARY
  tools/check-questions.html  checks the data files for mistakes and helps you write new questions
  tools/serve.ps1             small local test server (used by the .bat file)
  Start Local Test Server.bat double-click to test on this PC
  icons/                      app icons
  REFERENCES.md               list of every source used
  .nojekyll                   tells GitHub Pages to publish files as they are
```

---

## 1. Test it on your Windows PC

1. Open the `vertiv-study-app` folder in File Explorer.
2. Double-click **`Start Local Test Server.bat`**.
   - A black window opens and your browser goes to `http://localhost:8080/`.
   - If Windows asks about PowerShell or the firewall, choose **Allow**.
3. Use the app. When you are done, close the black window.

(Opening `index.html` directly by double-clicking will **not** work. Browsers block it from loading the data files. Use the .bat file instead.)

---

## 2. Publish it on GitHub Pages (one time)

You only need a web browser for this. You don't need to install anything.

### A. Create the repository
1. Sign in at <https://github.com>.
2. Click **+** (top right) -> **New repository**.
3. Repository name: `vertiv-study-app` (or any name you like).
4. Choose **Public**. GitHub Pages is free for public repositories. (A private repository needs a paid GitHub plan to use Pages.)
5. Leave the other options alone and click **Create repository**.

### B. Upload the files
1. On the new repository page, click the **uploading an existing file** link (or **Add file -> Upload files**).
2. In File Explorer, open the `vertiv-study-app` folder, select **everything inside it** (Ctrl+A), and drag it onto the GitHub page. Folders such as `data`, `icons` and `tools` upload along with their contents.
3. Wait for all the files to finish uploading, then click **Commit changes**.
4. Check that you see `index.html`, `app.js`, and the `data` and `icons` folders in the file list.

### C. Turn on GitHub Pages
1. In the repository, click **Settings** (top menu) -> **Pages** (left menu).
2. Under **Build and deployment** -> **Source**, choose **Deploy from a branch**.
3. Under **Branch**, choose **main** and folder **/ (root)**, then click **Save**.
4. Wait 1-2 minutes, then refresh the page. A box appears: *"Your site is live at `https://YOUR-USERNAME.github.io/vertiv-study-app/`"*.

The app uses relative paths, so it works at that project address. GitHub Pages provides HTTPS automatically, and HTTPS is required for offline mode and installation.

### D. Test on the laptop
Open the site address in Edge or Chrome. Click each of the five sections. Open **About & Help**. After a few seconds online it should say *"Ready for offline use."*

### E. Install on the iPhone
1. On the iPhone, open the site address in **Safari**. It must be Safari, not Chrome.
2. Tap the **Share** button (the square with an up arrow).
3. Scroll down and tap **Add to Home Screen**, then tap **Add**.
4. Open the app from the new **Tech Study** icon. Leave it open for a few seconds while online so it can save itself for offline use.
5. To test offline: turn on Airplane Mode and open the icon. The app, questions, study notes and scenarios should all work. Reference links to manuals still need internet.

**iPhone notes**
- The Home Screen app keeps its **own** saved progress, separate from Safari. Pick one and stick with it.
- To move progress between devices or keep a backup, go to **My Progress -> Save backup file**, then use **Load backup file** on the other device.

---

## 3. Add or edit questions (no programming)

The easiest way is to edit right on GitHub:

1. On GitHub, open `data/questions.json` and click the **pencil** icon (Edit).
2. Open your site's question maker at `https://YOUR-USERNAME.github.io/vertiv-study-app/tools/check-questions.html`, or use `http://localhost:8080/tools/check-questions.html` while testing on your PC.
3. Scroll to **Make a new question**, fill in the boxes, and click **Create question text**.
4. Copy the text it produces, which starts with a comma.
5. Back in the GitHub editor, scroll to the bottom of `questions.json`. The file ends like this:
   ```
   ...,"confidence":"general"}     <- end of the last question
   ]
   }
   ```
   Click right after the last question's closing `}`, before the line with `]`, and paste.
6. Click **Commit changes**.
7. After about a minute, reload the checker page. It should say **All files are OK**.

**Rules for questions**
- Each question needs a unique `id`, a `topic` (one of: `refrigeration`, `compressors`, `airflow`, `electrical`, `controls`, `humidity`, `equipment`, `maintenance`, `troubleshooting`), a `difficulty` (`basic`, `intermediate` or `advanced`), exactly **4** `choices`, an `answer` letter (A-D, matching the order you typed the choices), an `explanation`, and a `confidence` (`verified`, `general` or `model-specific`).
- The app **shuffles** the answer order, so never write "choice A" or "answer B" in an explanation.
- Inside text, use a single quote `'`, not a double quote `"`. A double quote breaks the file.
- `refs` must match `id` values in `data/references.json`.

## 4. Edit study notes

Open `data/topics.json`. Each topic has `sections`. Each section has a `heading` and a `body`, and the body is a list of paragraphs. The file's `_help` line at the top explains the special blocks: bullet `list`, `note` boxes and `table`. Wrap text in `**double asterisks**` to make it **bold**. To change how many exam questions a topic gets, change its `examWeight` (a bigger number gives it more questions).

## 5. Add reference documents

Open `data/references.json`, copy an existing `{ ... }` block, paste it after another block (with a comma between blocks), and change the `id`, `title`, `org`, `category`, `models`, `description`, `url` and `topics`.

**PDFs:** only add a PDF file to the project if you have the right to share it. Most Vertiv manuals are copyrighted, so link to them instead. If you do add a PDF you are allowed to share, put it in a `references/` folder, upload it, and use `"url": "references/your-file.pdf"`.

## 6. Updating the app without losing progress

- Saved progress (scores, bookmarks, missed questions) is stored in each person's browser, not in the files. Uploading new questions or notes does **not** erase it.
- The app always tries to load the newest files when it is online, so new questions appear the next time the student opens it with internet. To force an update, use **About & Help -> Check for new questions now**.
- Don't change question `id`s you have already published. Progress is linked to the id.
- If you ever add a **new file** that must work offline, add its name to the `FILES` list in `service-worker.js`.

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| App says "Could not load the study material" | A data file has a typo. Open `tools/check-questions.html`. It names the file and the approximate line. Usually it's a missing comma, an extra comma after the last item, or a `"` inside text. |
| Double-clicking `index.html` shows nothing | Use `Start Local Test Server.bat` or the GitHub Pages address. |
| `.bat` window closes right away | Port 8080 may be in use. Close other copies of the server and try again. |
| GitHub Pages shows 404 | Wait 2 minutes. Check that Settings -> Pages uses branch `main`, folder `/ (root)`, and that `index.html` is in the top level of the repository, not inside a subfolder. |
| New questions don't show on the iPhone | Open the app while online, then tap About & Help -> Check for new questions now. |
| "Add to Home Screen" is missing | Use Safari, not Chrome. Scroll down in the Share menu. |
| Exam timer seems off after the phone slept | The timer is based on the real clock. Time keeps running while the phone is locked, just like a real exam. |

## 8. What was tested (14 Nov 2026)

**Tested and working:**
- Desktop browser at a phone-size screen (375 x 812) and a laptop-size screen (1366 x 800). None of the 18 screens scroll sideways.
- Practice: answering, right/wrong highlighting, explanations, the answer staying hidden until you pick one, bookmarks, flags, the session summary, retrying missed questions.
- Exam: exactly 25 unique questions spread across topics, 60:00 countdown, previous/next/jump, marking questions, leaving questions blank, the submit confirmation, scoring (checked with a known 10-of-25 result), results by subject, missed-question review, practicing the missed questions.
- Automatic submit when time runs out, including after a page reload.
- Saved progress and exam history after a reload.
- All 14 troubleshooting scenarios played through to the end.
- Library search and the category filter.
- The checker: 186 questions, no duplicate IDs, no duplicate choices, every question has exactly one valid answer letter, and every reference ID resolves.
- Offline mode in Microsoft Edge. The service worker cached the app, and with the local server shut down the app still loaded and read all 186 questions from the cache.

**Not tested here:**
- A real iPhone and Safari, including the Home Screen install. The layout was checked at iPhone size in a desktop browser.
- The live GitHub Pages site, because it hasn't been published yet. All paths are relative, so it should work at the project address.
- Some reference links. Several Vertiv product pages, ASHRAE, ESFI and ManualsLib block automated link checkers, so they are marked * in REFERENCES.md. All other links returned HTTP 200.
