"use strict"

// Requirements
const { execSync } = require("child_process")
const { readFileSync } = require("fs")

// Constants
const Utf8 = { encoding: "utf8" }
const MaxMessageLength = 72
const Tags = [
    "Breaking",
    "Build",
    "Chore",
    "Docs",
    "Fix",
    "New",
    "Update",
    "Upgrade",
]
const TagPattern = new RegExp(String.raw`^(?:${Tags.join("|")}): `, "u")
const RefPattern = /(?:[\w_-]+[/][\w_-]+)?#\d+/u
const ExplicitRef = String.raw`(?:fixes|refs) ${RefPattern.source}`
const SuffixPattern = new RegExp(
    String.raw` \(${ExplicitRef}(?:, ${ExplicitRef})*\)$`,
    "gu",
)

// Dump triggers.
console.log("Event:   %s", process.env.GITHUB_EVENT_NAME)
console.log("Action:  %s", process.env.GITHUB_ACTION)

// Load event data.
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH))
if (!event.pull_request) {
    console.log("Unknown Event Payload:", JSON.stringify(event, null, 4))
    process.exitCode = 1
    return
}
const { commits, head, title } = event.pull_request
const subject = commits === 1 ? getCommitSubject(head.sha) : title
const targetName = commits === 1 ? "the commit message" : "the PR title"

console.log("Subject: %j (%s)", subject, targetName)
console.log()

if (subject.startsWith('Revert "')) {
    console.log("Skip validation because of reverting commit.")
} else {
    // Validate Length.
    const issueSuffixMatch = SuffixPattern.exec(subject)
    const subjectBody = issueSuffixMatch
        ? subject.slice(0, issueSuffixMatch.index)
        : subject
    const isValidLength = subject.length <= MaxMessageLength
    const isValidTag = TagPattern.test(subject)
    const isValidRef = !RefPattern.test(subjectBody)

    print(
        isValidLength,
        `The length of ${targetName} must be shorter than ${MaxMessageLength +
            1}.`,
        `But got ${subject.length}. Please make it shorter.`,
    )
    print(
        isValidTag,
        `${targetName} must start with a tag (one of ${Tags.join(", ")}).`,
        `But could not find any tag. Please fix ${targetName}.`,
    )
    print(
        isValidRef,
        `${targetName} must end with '(fixes #123)' or '(refs #123)' if the subject had issue references.`,
        `But found issue reference(s) as another form. Please fix ${targetName}.`,
    )

    if (!isValidLength || !isValidRef || !isValidTag) {
        console.log(
            capitalize(
                `${targetName} was invalid. See https://github.com/eslint/eslint-github-bot/blob/master/docs/commit-message-check.md for more information.`,
            ),
        )
        process.exitCode = 1
    }
}

// Helpers.
function getCommitSubject(sha) {
    const stdout = execSync(`git log --format=%s ${sha}^..${sha}`, Utf8)
    return stdout.replace(/\n$/u, "")
}

function print(condition, description, invalidMessage) {
    const mark = condition ? "✔" : "✘"
    const message = condition ? "Good!" : invalidMessage
    console.log(
        `${mark} ${capitalize(description)}\n    ▶ ${capitalize(message)}\n`,
    )
}

function capitalize(text) {
    return text[0].toUpperCase() + text.slice(1)
}
