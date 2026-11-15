# Rejected V4 portrait reuse

The user rejected this batch because the reused V4 portraits changed identities and coat colors from the current V5 animation (for example the brown hen and gray-brown rabbit).

`icons/` and `published/` retain the ten rejected PNG/WebP portraits. `choice-registration-v6.json`, historical V4 raw sheets and `choice-feed-evidence/v6-r3/selection-icons*` preserve the earlier source chain. These are history, not active portrait sources.

Active portraits are newly generated with each ID's current V5 adult/mature frames 0 and 3 as image_gen inputs. Their immutable capture is `choice-registration-v7.json`, with new originals under `raw/choice-v7/` and actual prompts in `choice-prompts-v7.md`. Both regular production and `--choices-only` consume that new source chain.
