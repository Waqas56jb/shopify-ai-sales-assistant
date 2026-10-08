import { useAppData } from '../context/AppDataContext'
import { API_BASE } from '../lib/config'

function resolveImage(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`
}

export default function Products() {
  const { knowledge, dbStatus } = useAppData()
  const products = knowledge.filter((k) => k.type === 'product')

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Product catalog</h3>
        <span>
          {products.length} products · {dbStatus === 'connected' ? 'Supabase' : 'API'}
        </span>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Order</th>
              <th>Name</th>
              <th>Price</th>
              <th>Description</th>
              <th>Training</th>
            </tr>
          </thead>
          <tbody>
            {products
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((p) => {
                const src = resolveImage(p.imageUrl)
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="kb-thumb">
                        {src ? (
                          <img src={src} alt={p.title} />
                        ) : (
                          <div className="kb-thumb-empty">—</div>
                        )}
                      </div>
                    </td>
                    <td>{p.sortOrder}</td>
                    <td>
                      <strong>{p.title}</strong>
                    </td>
                    <td>{p.price ? `$${p.price}` : '—'}</td>
                    <td className="cell-clamp">{p.description}</td>
                    <td>
                      <span className={`badge ${p.trained ? 'trained' : 'untrained'}`}>
                        {p.trained ? 'trained' : 'needs training'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            {!products.length && (
              <tr>
                <td colSpan={6} className="muted">
                  No products yet. Run <code>npm run db:seed</code> in the server folder.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
