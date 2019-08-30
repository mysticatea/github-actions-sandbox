"use strict"

// Requirements
const { readFileSync } = require("fs")
const { request } = require("https")

// Constants
const TargetLabel = "needs info"

// Load event data.
const token = process.env.INPUT_GITHUB_TOKEN
if (!token) {
    console.log("GITHUB_TOKEN not found.")
    process.exitCode = 1
    return
}
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH))
if (!event.issue || !event.label) {
    console.log("Unknown Event Payload:", JSON.stringify(event, null, 4))
    process.exitCode = 1
    return
}
console.log("Event:   %s", process.env.GITHUB_EVENT_NAME)
console.log("Action:  %s", event.action)
if (event.action !== "labeled") {
    return
}
const repo = process.env.GITHUB_REPOSITORY
const issueId = event.issue.number
const userId = event.issue.user.login
const label = event.label.name
const body = `Hi @${userId}, thanks for the issue.`

console.log("Issue:   %s#%d (by @%s)", repo, issueId, userId)
console.log("Label:   %s", label)

if (label !== TargetLabel) {
    return
}

const req = request(
    {
        method: "POST",
        href: `https://api.github.com/repos/${repo}/issues/${issueId}/comments`,
        headers: { Authorization: `token ${token}` },
    },
    res => {
        console.log("Result:  %d %s", res.statusCode, res.statusMessage)
        if (res.statusCode < 200 || res.statusCode >= 300) {
            res.pipe(process.stderr)
        }
    },
)
req.write(JSON.stringify({ body }))
req.end()

//
