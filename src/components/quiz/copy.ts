// Pass and fail lines are the BRAND.md microcopy. The rest is draft copy, awaiting Rich's
// approval (brand p.69, plan decision 12).
export const QUIZ_COPY = {
  signedOut: 'Want to test your knowledge? Sign in to take the quiz.',
  sessionEnded: 'Your session has ended. Sign in again to take the quiz.',
  locked: 'Watch the video to unlock the quiz.',
  nearlyThere: 'Nearly there. Keep this page open and the quiz will unlock shortly.',
  ready: 'A few quick questions on this lesson. Pick one answer for each.',
  passedBefore: "You've passed this quiz. Take it again any time.",
  limited: "That's 10 goes in the last hour. Have another look at the video and try again later.",
  pass: "Nailed it. That's one more lesson done.",
  certified: "You're Carbon Certified. Your certificate is ready to download.",
  fail: (score: number, total: number) =>
    `${score} of ${total} correct. Have another look at the video and try again.`,
  error: 'Something went wrong on our end. Give it another go in a minute.',
}
