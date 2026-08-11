# LEARNING_ACCESSIBILITY_AUDIT_AND_QUICKWINS_V1

REGISTERED_BASE_SHA=b1a18bf96acdc125d8c61e3edb76cd1dc62c6213
SCOPE=Learner-facing Learning UI only (no Collab / migrations / redesign)

## Audit findings (learner-facing)
- LearningShell lacked main landmark label and skip link
- Progress lacked progressbar semantics
- Catalog/course cover images used empty alt
- Video/audio controls lacked aria-label
- Assignment upload label association was weak; errors not announced
- Some secondary text contrast was too low (white/35–40 on near-black)
- Attempt player heading/region labeling incomplete

## Quick wins implemented
1. LearningShell: main aria-label, skip-to-content, nav landmark, contrast bump on back link
2. ProgressSummary: progressbar + labeled group + contrast bump
3. ContinueWatchingVideo / ContentBlockRenderer: media aria-label + focus ring
4. ActivityList: list aria-label, richer link aria-label, contrast bump
5. AssignmentFileUploadField: htmlFor/id, aria-describedby/invalid/busy, alert errors
6. Catalog pages: meaningful cover alt from course name
7. LearnerResultSummary: role=status aria-live
8. AssessmentSubmitForm: focus-visible checkbox
9. AttemptPlayer: labelled heading/region; autosave status contrast
10. LearningHub: secondary text contrast bump

## Out of scope / deferred
- Full WCAG AA audit of all instructor surfaces
- Product-flow redesign
- Captions/transcript authoring pipeline (content-owned)
- External media provider accessibility

## Verification
- npx tsc --noEmit = PASS
- git diff --check = PASS
