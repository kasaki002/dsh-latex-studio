Write LaTeX, build it, and read the PDF without leaving DSH. The engine is a **portable MiKTeX** (xelatex / pdflatex): no registry writes, no PATH changes, no administrator rights.

## Usage

1. Open any conversation and click the **LaTeX** tab at the top.
   - No tab? Open **Settings → LaTeX studio** and turn the switch on.
2. On first use it says the engine is missing; click the button to install (about 150 MB).
3. Pick a file with **Import file** (built-in browser with address bar, breadcrumbs, search and sorting), or drop a `.tex` file or a whole project folder onto the window.
4. Click **Compile**. The PDF appears on the right, with a **Download PDF** button once the build succeeds.
5. Click **Open web version** to open the web editor.
6. The reset button is in the top-left corner.

## What you get

- **Editor + preview**: source on the left, PDF on the right.
- **Settings → LaTeX studio**: visibility switch + **Open web version**.
- **Formula panel**: symbols, templates and live preview tabs; click to insert at the caret, web editor only.
- **Drop a whole project**: `figures/`, `chapters/` and `.bib` files keep their relative paths and images stay intact.
- **New file**: a built-in folder browser, a filename field and an optional ctexart starter template.
- **Conversation view**: compile, preview and download without opening the web editor.
- **Document output**: tick "Prefer generating .tex files" and pick a DSH workspace — inside that workspace document requests produce only `.tex` (no docx + pdf); a PDF can be added. Turning it off removes the injected line again.
- **Live compile**: pick "after typing pauses" or "after save" in Settings and the PDF refreshes itself.
- **Automatic reruns**: a second LaTeX pass when `Rerun`, undefined references or changed labels ask for it; documents using `\bibliography` run bibtex too.

## Notes

- Choose `xelatex` for Chinese documents; `auto` detects them.
- The first Chinese build downloads `ctex` and friends on demand, so it is slower; later builds are not.
- I can also compile from chat: give `latex_compile` a path, or ask `latex_status` whether the engine is installed.
- Without biber / full biblatex, use `bibtex`; the build pipeline already handles it.

>Full documentation, layout, security model and integrations are in [GitHub](https://github.com/kasaki002/dsh-latex-studio).
