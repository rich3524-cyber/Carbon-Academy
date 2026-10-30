import type { Factor } from '@/lib/admin/factors'

const control =
  'min-h-11 w-full rounded-field border-2 border-concrete bg-white px-4 py-3 text-body outline-offset-2 focus:outline-2 focus:outline-carbon-black'

/**
 * Step-up (decision 4): a fresh code inside every high-risk form, so no dialog or extra
 * JavaScript is needed. The factor choice only shows when there's more than one.
 */
export function StepUpFields({ factors }: { factors: Factor[] }) {
  const verified = factors.filter((f) => f.verified)
  const [first] = verified
  if (!first) return null
  return (
    <fieldset className="flex flex-col gap-3 rounded-field border-2 border-dust p-4">
      <legend className="px-1 font-bold">Confirm it&apos;s you</legend>
      {verified.length > 1 ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="field-stepUpFactor" className="font-bold">
            Authenticator
          </label>
          <select
            id="field-stepUpFactor"
            name="stepUpFactor"
            defaultValue={first.id}
            className={control}
          >
            {verified.map((factor) => (
              <option key={factor.id} value={factor.id}>
                {factor.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="stepUpFactor" value={first.id} />
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="field-stepUpCode" className="font-bold">
          Code from your authenticator app
        </label>
        <input
          id="field-stepUpCode"
          name="stepUpCode"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          className={`${control} max-w-48 tracking-widest`}
        />
      </div>
    </fieldset>
  )
}
