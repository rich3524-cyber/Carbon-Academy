/**
 * Bot trap (control 19). Hidden from people and screen readers. Bots that fill every field
 * get the normal "check your email" reply, and no email is sent.
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="field-website">Leave this empty</label>
      <input id="field-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  )
}
