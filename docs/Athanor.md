# Athanor

This document helps us plan our athanor agentic harness prompt. The prompt will
drive the harness to create a plan, then follow through with creating tasks, and
finally process each task until the app is completed.

More details about Athanor can be found in its [README.md](../../athanor/README.md)

## Prompt

The prompt text is found in `docs/athanor-prompt.txt` and can be read in using `$(cat docs/athanor-prompt.txt)`

## Command

```sh
./bin/athanor plan --enrichment-critic "$(cat docs/athanor-prompt.txt)"
```
