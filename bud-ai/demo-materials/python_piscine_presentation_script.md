# Presentation Script — Piscine Python for Data Science, Day 1: Array
**Companion to:** `python_piscine_array_slides.pdf` (12 slides)
**Estimated runtime:** ~8 minutes
**Delivery note:** this is a walkthrough script, not a word-for-word read — say it in your own voice, but hit every bolded checkpoint so nothing critical gets skipped.

---

### Slide 1 — Title

"Morning everyone. Today's the first day of the piscine, and the topic is **Array** — that's lists, 2D arrays, and images, all treated as arrays you can slice, transform, and filter.

We've got six exercises today, plus the ground rules that apply to every single one of them. I'll walk through the rules first, then go exercise by exercise — what you're building, what the function signatures look like, and what output you should expect to see. Let's get into it."

---

### Slide 2 — Agenda

"Quick map of the session. We start with the rules — general rules that apply to every piscine day, plus today's specific instructions. Then six exercises:

- **Ex 00**, Give My BMI — turning lists into BMI values.
- **Ex 01**, 2D Array — shape and slicing.
- **Ex 02**, Load My Image — treating an image as a pixel array.
- **Ex 03**, Zoom On Me — slicing and displaying a region of that image.
- **Ex 04**, Rotate Me — a hand-written transpose.
- **Ex 05**, Pimp My Image — five color filters with restricted operators.

Notice the progression: we start with plain lists, move into 2D arrays, then apply everything we just learned to actual images. By the end of today you'll have taken an image apart and put it back together several different ways."

---

### Slide 3 — General Rules

"Before any code — the rules that will get you a **zero** if you ignore them, so pay attention here.

First, environment: you're working from a cluster computer, either directly or through a VM you've configured yourself. Everything has to be installed and working *before* your evaluation starts — not during it.

Second, and this is the big one: **your functions must never crash unexpectedly.** Segfault, bus error, double free — any of that, and your whole project is considered non-functional. Zero. So build in your error handling from the start, don't bolt it on at the end.

Third — only what's in your **git repository** gets graded. Test scripts are encouraged, they're genuinely useful for your own defense, but they're not submitted and not graded.

And finally: **Python 3.10**, explicit imports only — `import numpy as np`, never a wildcard import — and **no global variables**. Keep that in your head for every exercise today."

---

### Slide 4 — Specific Instructions of the Day

"Now the instructions specific to today's exercises — these apply to every file you write.

No code sitting in the global scope. Everything lives inside a function, and every program needs a **guarded main**, exactly like what's on screen: a `main()` function, called only inside `if __name__ == "__main__":`. This isn't optional style — it's how your program has to be structured.

Next — **any uncaught exception invalidates the exercise.** Even if the exception is something you were specifically asked to test for. So catch it, handle it, and give a clear message instead of letting Python crash.

Every function also needs a docstring — that's the `__doc__` attribute — and your code needs to pass the norm. That's flake8 — `pip install flake8`, and alias it to `norminette` so it matches what you're used to typing.

Keep this slide in mind as we go through the exercises — I won't repeat 'add a docstring' and 'wrap it in main' six more times, but it applies to literally everything coming up."

---

### Slide 5 — Exercise 00: Give My BMI

"First exercise, in `ex00/`, one file: `give_bmi.py`. You're allowed numpy or any table-manipulation library you like.

Two functions here. `give_bmi` takes two lists — height and weight — and returns a list of BMI values, one per person. `apply_limit` takes that list of BMI values plus an integer limit, and returns a list of booleans — `True` wherever the BMI is above that limit.

The part that'll actually catch people out is the error handling: what happens if the two lists aren't the same length? What if someone hands you a string instead of a number? You need to handle that gracefully, not let it explode. Straightforward math, but don't skip the validation."

---

### Slide 6 — Exercise 01: 2D Array

"`ex01/`, file is `array2D.py`. Same allowed libraries as before.

You're writing `slice_me`, which takes a 2D array plus a start and end index. It prints the array's shape, then returns a truncated version — a subset of the rows.

The catch: you **have to use slicing** to do this. Not a manual loop copying elements one by one — actual Python slice syntax. And again, handle the edge cases: rows of different lengths, or an input that isn't a list at all.

This one's short, but it's really about building the slicing habit you're going to lean on for the rest of the day, once we start working with real images."

---

### Slide 7 — Exercise 02: Load My Image

"`ex02/`, `load_image.py`. Now allowed functions open up — any library for loading images, plus your table-manipulation tools.

One function: `ft_load`, takes a file path, and returns the image as a pixel array. It also needs to print the image's shape. You need to support at least JPG and JPEG, and if loading fails for any reason — bad path, bad format — raise a clear error instead of a stack trace dump.

This is the bridge exercise: once an image is just an array of numbers, everything you did in exercises 00 and 01 — slicing, shaping — applies directly to pixels."

---

### Slide 8 — Exercise 03: Zoom On Me

"`ex03/`, two files this time: `load_image.py` and `zoom.py`. Broader library allowance now — anything for loading, manipulating, and *displaying* images.

You're loading `animal.jpeg`, and you need to print its size on the X and Y axis, the number of channels, and the actual pixel content. Then — the interesting part — you slice out a region of that image and display it, with the axis scale visible on the plot, so you can see exactly which pixel coordinates you're looking at.

Same rule as always: if anything goes wrong, the program should not crash — hand back a clear message instead. And your specific crop doesn't have to match anyone else's example exactly — the shape and the behavior are what's being checked."

---

### Slide 9 — Exercise 04: Rotate Me

"`ex04/`, `load_image.py` and `rotate.py`. Same image-handling library allowance as the last exercise.

You load `animal.jpeg` again, cut out a square region, and this time you **transpose** it — flip rows and columns — then display the result and print the new shape and data.

Here's the one everyone needs to hear twice: **you have to write the transpose yourself.** No calling a library's built-in transpose method for this one. That's the actual exercise — understanding what a transpose does at the array level, not just invoking it.

And like the last one — your resulting crop and array can look different from the example. What matters is that the transpose logic is genuinely yours and genuinely correct."

---

### Slide 10 — Exercise 05: Pimp My Image

"Last one, `ex05/`, `load_image.py` and `pimp_image.py`.

Five functions, five color filters — invert, red, green, blue, and grey — and every one of them has to return an array with the **same shape** it received.

Here's the twist: each filter is restricted to a specific, limited set of operators — you can see them on screen. Invert can use equals, plus, minus, and multiply. Red is just equals and multiply. Green is equals and minus. Blue is equals only. And grey is equals and divide. You don't have to use every operator you're allowed — but you can't reach outside that list.

And don't forget — from the instructions slide — every one of these five functions needs its own docstring. When you're done, display the original image next to all five filtered versions so the difference is visible at a glance."

---

### Slide 11 — Submission & Peer-Evaluation

"Once you're done — submit everything to your assigned git repository, as usual. Only what's in that repo gets evaluated, so don't leave anything sitting locally and assume it counts.

Double-check your folder and file names against what's on the sheet — `ex00/`, `ex01/`, and so on, matching exactly. And one thing worth knowing going in: the evaluation itself happens on **your** computer, the computer of the group being evaluated — so make sure your environment is actually working, not just your code."

---

### Slide 12 — Closing

"That's all six exercises. Start with the BMI list, work your way through slicing and images, and by the end you'll have loaded, sliced, transposed, and filtered a real image using nothing but array operations you wrote yourself.

Good luck — and use your brain."

---

## Facilitator notes (not spoken)

- **Pacing:** Slides 5–10 (the six exercises) carry most of the runtime — roughly 45–60 seconds each. If you're running short on time, Slides 3–4 (rules/instructions) can be trimmed to a faster read-through since the slides themselves carry the detail; don't cut time from Exercise 04's "write it yourself" warning or Exercise 05's operator restrictions — those are the two most common places people lose points.
- **Live coding option:** if you have time and a projector, Exercise 00 is short enough to live-code the function signature and one error-handling branch on screen while you talk through Slide 5 — it tends to make the "handle error cases" instruction land harder than saying it out loud alone.
- **Anticipated questions:** be ready for "does the transpose in Ex04 need to work on any shape, or just square crops?" and "can we use `numpy.rot90` if we're not calling it 'transpose'?" — both point back to the same rule: implement it yourself, don't route around the restriction with a different built-in.
