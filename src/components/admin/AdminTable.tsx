import type { ReactNode } from 'react'

/** A plain data table in a white card; scrolls sideways inside the card on phones. */
export function AdminTable({
  caption,
  headers,
  children,
  empty,
}: {
  caption: string
  headers: string[]
  children: ReactNode
  empty?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-card bg-white p-4 md:p-5">
      <table className="w-full min-w-[36rem] border-collapse text-left text-small">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b-2 border-dust">
            {headers.map((header) => (
              <th key={header} scope="col" className="px-2 py-3 font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={headers.length} className="px-2 py-4">
                Nothing here yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Cell({ children }: { children: ReactNode }) {
  return <td className="border-b border-dust px-2 py-3 align-top">{children}</td>
}
