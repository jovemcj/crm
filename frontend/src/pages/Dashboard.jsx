import { useEffect, useState } from 'react'
import { Users, TrendingUp, MessageSquare, DollarSign } from 'lucide-react'
import api from '../api/index.js'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ contacts: 0, deals: 0, chats: 0, revenue: 0 })
  const [recentDeals, setRecentDeals] = useState([])

  useEffect(() => {
    async function loadData() {
      try {
        const [contacts, deals, chats] = await Promise.all([
          api.get('/contacts'),
          api.get('/deals'),
          api.get('/messages/chats'),
        ])
        const totalRevenue = deals.data
          .filter((d) => d.stage?.name === 'Fechado')
          .reduce((sum, d) => sum + d.value, 0)

        setStats({
          contacts: contacts.data.length,
          deals: deals.data.length,
          chats: chats.data.length,
          revenue: totalRevenue,
        })
        setRecentDeals(deals.data.slice(0, 5))
      } catch {}
    }
    loadData()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Contatos" value={stats.contacts} color="bg-blue-500" />
        <StatCard icon={TrendingUp} label="Negócios" value={stats.deals} color="bg-violet-500" />
        <StatCard icon={MessageSquare} label="Conversas" value={stats.chats} color="bg-emerald-500" />
        <StatCard
          icon={DollarSign}
          label="Receita Fechada"
          value={`R$ ${stats.revenue.toLocaleString('pt-BR')}`}
          color="bg-amber-500"
        />
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Negócios Recentes</h2>
        {recentDeals.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum negócio ainda.</p>
        ) : (
          <div className="space-y-3">
            {recentDeals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{deal.title}</p>
                  <p className="text-xs text-slate-500">{deal.contact?.name} • {deal.stage?.name}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-400">
                  R$ {deal.value.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
