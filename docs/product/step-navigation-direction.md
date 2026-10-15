# Step navigation direction brief

## Who it is for

An early-stage founder working through one Founderive path step while the Claude terminal may be open beside the workbook.

## User goal

See where this step sits in the full path, jump directly to another step without returning Home, and continue to the next step after reviewing the current one.

## Primary next action

Keep the step's existing contextual primary action: **Write your answer**, **Mark step done**, or the Customer conversation action. Path navigation remains secondary so it does not compete with the work of the step.

## Secondary actions

- Jump to any named step from a compact path menu.
- Continue with **Next step: [step name]** at the bottom.
- Return to Home after the final step.
- Edit, talk through, test, reopen, or import using the existing controls.

## States

- **First run:** The path menu shows every step, identifies the current step, and makes the next step visible without implying that earlier work is complete.
- **Empty:** The existing rough-answer prompt and its main action remain unchanged; navigation is available but visually secondary.
- **Filtered-empty:** Not applicable because step screens have no filtered collection.
- **Populated:** The current step is identified in the menu, completed steps say “Done,” and every step remains directly reachable.
- **Imported:** A step with imported text says “Needs confirmation” on Home and in the step menu until the founder confirms or edits it.
- **Error:** An unknown step keeps the existing explanation and Home link; no misleading path menu is shown.
- **Success:** After a step is marked done, its completion state remains visible and the bottom control clearly names the next step. The final step points back to Home.

## Responsive direction

The menu sits in a sticky left column only when the workbook content has enough room. When the Claude terminal narrows the content area, it becomes a sticky horizontal list above the step so the steps remain visible while the founder works. On a small screen it uses the same compact horizontal layout without adding a second sticky bar beneath the workbook navigation.
