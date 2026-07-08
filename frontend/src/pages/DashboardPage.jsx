import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useParkingStore } from '../stores/parkingStore'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { municipios, datosZonas } = useParkingStore()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (datosZonas?.zonas) {
      const zonas = datosZonas.zonas
      const totalCapacidad = zonas.reduce((s, z) => s + z.capacidad, 0)
      const totalLibres = zonas.reduce((s, z) => s + z.libres, 0)
      const totalOcupados = totalCapacidad - totalLibres
      const ocupacion = totalCapacidad > 0 ? Math.round((totalOcupados / totalCapacidad) * 100) : 0

      setStats({
        totalZonas: zonas.length,
        totalCapacidad,
        totalLibres,
        totalOcupados,
        ocupacion,
        zonas: zonas.map(z => ({
          ...z,
          ocupacion: z.capacidad > 0 ? Math.round(((z.capacidad - z.libres) / z.capacidad) * 100) : 0,
        })),
      })
    }
  }, [datosZonas])

  return (
    <div className="min-h-screen bg-niebla">
      {/* Header */}
      <div className="bg-azul text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-white/80 hover:text-white">
          ← Volver
        </button>
        <h1 className="font-[family-name:var(--font-family-condensed)] text-xl font-bold uppercase tracking-wide">
          Dashboard
        </h1>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gris">Zonas</p>
              <p className="text-3xl font-bold font-[family-name:var(--font-family-condensed)]">{stats.totalZonas}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gris">Capacidad</p>
              <p className="text-3xl font-bold font-[family-name:var(--font-family-condensed)]">{stats.totalCapacidad}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gris">Libres</p>
              <p className="text-3xl font-bold font-[family-name:var(--font-family-condensed)] text-verde">{stats.totalLibres}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gris">Ocupación</p>
              <p className="text-3xl font-bold font-[family-name:var(--font-family-condensed)]">{stats.ocupacion}%</p>
            </div>
          </div>
        )}

        {/* Zones table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-[family-name:var(--font-family-condensed)] text-lg font-bold uppercase tracking-wide">
              Disponibilidad por zona
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-niebla">
                  <th className="text-left p-3 font-semibold text-gris text-xs uppercase tracking-widest">Zona</th>
                  <th className="text-right p-3 font-semibold text-gris text-xs uppercase tracking-widest">Libres</th>
                  <th className="text-right p-3 font-semibold text-gris text-xs uppercase tracking-widest">Total</th>
                  <th className="text-right p-3 font-semibold text-gris text-xs uppercase tracking-widest">Ocupación</th>
                  <th className="text-right p-3 font-semibold text-gris text-xs uppercase tracking-widest">Tarifa</th>
                </tr>
              </thead>
              <tbody>
                {stats?.zonas?.map((zona) => (
                  <tr key={zona.nombre} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-semibold">{zona.nombre}</div>
                      <div className="text-xs text-gris">{zona.ref}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-verde">{zona.libres}</td>
                    <td className="p-3 text-right">{zona.capacidad}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              zona.ocupacion > 88 ? 'bg-rojo' : zona.ocupacion > 65 ? 'bg-ambar' : 'bg-verde'
                            }`}
                            style={{ width: `${zona.ocupacion}%` }}
                          />
                        </div>
                        <span className="font-semibold">{zona.ocupacion}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">${zona.tarifa}/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
