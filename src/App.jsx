import { useState, useEffect } from 'react'
import icon from './assets/icon.png'
import { supabase } from './supabaseClient'

function App() {
  const [category, setCategory] = useState('all')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [search, setSearch] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showMessageBox, setShowMessageBox] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [favourites, setFavourites] = useState(() => JSON.parse(localStorage.getItem('locate_fav')||'[]'))
  const [userMessage, setUserMessage] = useState({ name: '', place: '', message: '' })
  const [chatMessages, setChatMessages] = useState([{ from: 'bot', text: 'Hi 👋 I am Locabarnes! How can I help you find a place in Kampala today?' }])
  const [dbPlaces, setDbPlaces] = useState([])
  const [visits, setVisits] = useState([])
  const [payForm, setPayForm] = useState({ businessName: '', phone: '', plan: '50000' })
  const [newPlace, setNewPlace] = useState({ name: '', type: 'restaurant', area: '', price: '', badges: '', locaNote: '', image: '', rating: '4.8', payment_status: 'paid', payment_expiry: '', sponsored: false, is_active: true })
  const [editingId, setEditingId] = useState(null)

  // --- FREE TRACING FUNCTION ---
  const trackVisit = async (page, business=null, term=null) => {
    try {
      await supabase.from('app_visits').insert({
        page, business_name: business, search_term: term, user_agent: navigator.userAgent.slice(0,150)
      })
    } catch(e){}
  }

  useEffect(() => {
    const fetchPlaces = async () => {
      const { data } = await supabase.from('businesses').select('*').eq('is_active', true).order('sponsored', {ascending:false}).order('created_at', {ascending:false})
      if(data) setDbPlaces(data)
    }
    fetchPlaces()
    trackVisit('home_open')
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if(isAdmin){
      const fetchVisits = async () => {
        const { data } = await supabase.from('app_visits').select('*').order('created_at', {ascending:false}).limit(100)
        if(data) setVisits(data)
      }
      fetchVisits()
    }
  }, [isAdmin])

  const handleInstallApp = async () => {
    trackVisit('click_download_app')
    if(deferredPrompt){
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if(outcome === 'accepted'){ alert('✅ LocateUG Installed! Check Home Screen!'); setDeferredPrompt(null) }
    } else {
      alert('📲 HOW TO DOWNLOAD:\nAndroid: Tap ⋮ > Add to Home screen > Install\niPhone: Tap Share > Add to Home Screen')
    }
  }

  const toggleFav = (id) => {
    const updated = favourites.includes(id)? favourites.filter(f=>f!==id) : [...favourites, id]
    setFavourites(updated); localStorage.setItem('locate_fav', JSON.stringify(updated))
  }

  const sharePlace = (place) => {
    trackVisit('share', place.name)
    const text = `📍 Found on LOCATE: ${place.name} - ${place.area} ${place.price} \nhttps://locate-ug.vercel.app`
    if(navigator.share) navigator.share({title: place.name, text})
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const places = [...dbPlaces]
  const sponsoredAds = places.filter(p=>p.sponsored)
  const totalPlaces = places.length

  const handleAddPlace = async () => {
    if(!newPlace.name ||!newPlace.area) { alert('Fill Name & Area!'); return }
    const payload = {
      name: newPlace.name, type: newPlace.type, area: newPlace.area, price: newPlace.price,
      badges: newPlace.badges.split(',').map(b=>b.trim()).filter(Boolean),
      locaNote: newPlace.locaNote, image: newPlace.image || `https://picsum.photos/400/300?random=${Date.now()}`,
      rating: parseFloat(newPlace.rating), payment_status: newPlace.payment_status,
      payment_expiry: newPlace.payment_expiry || null, sponsored: newPlace.sponsored, is_active: newPlace.is_active
    }
    let error
    if(editingId){ const res = await supabase.from('businesses').update(payload).eq('id', editingId); error = res.error }
    else { const res = await supabase.from('businesses').insert(payload); error = res.error }
    if(error) alert(error.message)
    else { alert(editingId? '✅ Updated!' : '✅ Saved!'); setEditingId(null); window.location.reload() }
  }

  const handleDelete = async (id) => {
    if(!confirm('Delete forever?')) return
    const { error } = await supabase.from('businesses').delete().eq('id', id)
    if(error) alert(error.message)
    else { alert('🗑️ Deleted'); setDbPlaces(dbPlaces.filter(p=>p.id!==id)) }
  }

  const handleEdit = (place) => {
    setEditingId(place.id)
    setNewPlace({ name: place.name, type: place.type, area: place.area, price: place.price||'', badges: (place.badges||[]).join(','), locaNote: place.locaNote||'', image: place.image||'', rating: String(place.rating||4.8), payment_status: place.payment_status||'paid', payment_expiry: place.payment_expiry||'', sponsored:!!place.sponsored, is_active: true })
    window.scrollTo({top:0, behavior:'smooth'})
  }

  const handleCustomerPay = async () => {
    if(!payForm.businessName ||!payForm.phone){ alert('Fill business & phone!'); return }
    const { error } = await supabase.from('businesses').insert({
      name: payForm.businessName, area: 'Pending Verification', type: 'restaurant',
      price: payForm.plan === '50000'? '50k/month' : payForm.plan === '120000'? '120k/3 months' : '200k/6 months',
      payment_status: 'pending', sponsored: true, is_active: false,
      badges: ['⏳ Awaiting Payment'], locaNote: `Customer ${payForm.phone} - Pay ${payForm.plan} UGX - MoMo to 0781675995`,
      image: `https://picsum.photos/400/300?random=${Date.now()}`, rating: 4.8
    })
    if(error) alert(error.message)
    else {
      trackVisit('pay_click', payForm.businessName)
      const msg = `Hi Locabarnes! I want to PAY for LOCATE AD\nBusiness: ${payForm.businessName}\nPhone: ${payForm.phone}\nPlan: ${payForm.plan} UGX`
      window.open(`https://wa.me/256781675995?text=${encodeURIComponent(msg)}`, '_blank')
      alert('✅ Request sent! Pay MoMo to 0781675995'); setShowPay(false)
    }
  }

  const loginAdmin = () => { if(adminPass === 'locabarnes2026') setIsAdmin(true); else alert('Wrong!') }
  const sendUserMessage = () => {
    if(!userMessage.message) return; setChatMessages([...chatMessages, {from:'user', text:userMessage.message}]);
    trackVisit('message', null, userMessage.message)
    const text = `LOCATE from ${userMessage.name||'User'}%0APlace: ${userMessage.place}%0AMsg: ${userMessage.message}`
    setTimeout(()=>{ setChatMessages(prev=>[...prev, {from:'bot', text:'✅ Opening WhatsApp...'}]); window.open(`https://wa.me/256781675995?text=${text}`, '_blank') }, 800); setUserMessage({name:'',place:'',message:''})
  }

  const categories = [
    { id: 'all', label: 'All', emoji: '📍' }, { id: 'restaurant', label: 'Food', emoji: '🍽️' },
    { id: 'hotel', label: 'Hotels', emoji: '🏨' }, { id: 'lounge', label: 'Lounge', emoji: '🍹' },
    { id: 'supermarket', label: 'Shops', emoji: '🛒' }, { id: 'fuel', label: 'Fuel', emoji: '⛽' },
    { id: 'hospital', label: 'Hospital', emoji: '🏥' }, { id: 'favourite', label: 'Favs', emoji: '❤️' },
  ]

  const filtered = places.filter(p => {
    if(category==='favourite') return favourites.includes(p.id)
    const matchCat = category === 'all' || p.type === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.area.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if(showAdmin) return (
    <div className="min-h-screen bg-[#0B1220] text-white p-6 max-w-3xl mx-auto">
      <button onClick={()=>setShowAdmin(false)} className="mb-4 text-sm bg-white/10 border border-white/10 px-4 py-2 rounded-full">← Back</button>
      <div className="flex items-center gap-3 mb-6"><img src={icon} className="w-12 h-12 rounded-full bg-white" /><div><h1 className="font-black text-2xl">Locabarnes Admin PRO</h1><p className="text-xs text-slate-400">Edit • Delete • 📊 Trace Users</p></div></div>
      {!isAdmin? (<div className="bg-white/5 border border-white/10 p-6 rounded-2xl"><input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Password" className="w-full p-3 rounded-xl text-black bg-white" /><button onClick={loginAdmin} className="w-full mt-3 bg-yellow-400 text-black py-3 rounded-xl font-black">Unlock</button></div>) : (
        <>
        {/* TRACING DASHBOARD */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-400 text-black p-5 rounded-2xl mb-6">
          <h2 className="font-black text-lg">📊 LIVE USER TRACING (FREE)</h2>
          <p className="text-sm font-bold mt-1">Total Visits: {visits.length} • Last 100 shown</p>
          <p className="text-xs mt-1 opacity-80">Track: Who opened app, which business they viewed, what they searched</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-6 max-h-[300px] overflow-y-auto">
          {visits.map(v=>(
            <div key={v.id} className="border-b border-white/5 py-2 flex justify-between text-xs">
              <div><span className="font-bold text-yellow-400">{v.page}</span> {v.business_name && <span className="text-white">- {v.business_name}</span>} {v.search_term && <span className="text-slate-400">"{v.search_term.slice(0,20)}"</span>}</div>
              <div className="text-slate-500">{new Date(v.created_at).toLocaleTimeString()}</div>
            </div>
          ))}
          {visits.length===0 && <p className="text-xs text-slate-400">No visits yet - open app on phone to test!</p>}
        </div>

        <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
          <p className="font-bold text-yellow-400">{editingId? '✏️ EDITING' : '💰 ADD BUSINESS'}</p>
          <input value={newPlace.name} onChange={e=>setNewPlace({...newPlace, name:e.target.value})} placeholder="Business Name" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white" />
          <div className="grid grid-cols-2 gap-3">
            <select value={newPlace.type} onChange={e=>setNewPlace({...newPlace, type:e.target.value})} className="p-3 bg-[#1a2332] border border-white/10 rounded-xl"><option value="restaurant">Food</option><option value="hotel">Hotel</option><option value="lounge">Lounge</option><option value="supermarket">Shop</option><option value="fuel">Fuel</option><option value="hospital">Hospital</option></select>
            <input value={newPlace.area} onChange={e=>setNewPlace({...newPlace, area:e.target.value})} placeholder="Area" className="p-3 bg-white/5 border border-white/10 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={newPlace.price} onChange={e=>setNewPlace({...newPlace, price:e.target.value})} placeholder="Price" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl" />
            <select value={newPlace.payment_status} onChange={e=>setNewPlace({...newPlace, payment_status:e.target.value})} className="p-3 bg-[#1a2332] border border-white/10 rounded-xl"><option value="unpaid">💸 Unpaid</option><option value="pending">⏳ Pending</option><option value="paid">✅ Paid</option></select>
          </div>
          <input value={newPlace.badges} onChange={e=>setNewPlace({...newPlace, badges:e.target.value})} placeholder="Badges e.g. WiFi,Parking" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl" />
          <input value={newPlace.locaNote} onChange={e=>setNewPlace({...newPlace, locaNote:e.target.value})} placeholder="Note" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl" />
          <input value={newPlace.image} onChange={e=>setNewPlace({...newPlace, image:e.target.value})} placeholder="Image URL" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleAddPlace} className="w-full bg-yellow-400 text-black py-4 rounded-xl font-black">{editingId? '💾 Update' : '+ Add'}</button>
            {editingId && <button onClick={()=>{setEditingId(null); setNewPlace({ name: '', type: 'restaurant', area: '', price: '', badges: '', locaNote: '', image: '', rating: '4.8', payment_status: 'paid', payment_expiry: '', sponsored: false, is_active: true })}} className="w-full bg-white/10 border border-white/10 py-4 rounded-xl font-bold">Cancel</button>}
          </div>
        </div>
        <div className="mt-8"><h2 className="font-black text-lg mb-3">📋 All Businesses ({dbPlaces.length})</h2><div className="space-y-2">{dbPlaces.map(p=>(<div key={p.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center"><div><p className="font-bold text-sm">{p.name}</p><p className="text-xs text-slate-400">{p.area} • {p.payment_status}</p></div><div className="flex gap-2"><button onClick={()=>handleEdit(p)} className="bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-full text-xs font-bold">✏️ Edit</button><button onClick={()=>handleDelete(p.id)} className="bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-full text-xs font-bold text-red-300">🗑️ Delete</button></div></div>))}</div></div>
        </>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#0f172a] flex flex-col">
      <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }.animate-marquee { animation: marquee 40s linear infinite; display: flex; width: max-content; }`}</style>
      <div className="bg-[#0B1220] text-white p-3 sticky top-0 z-30 border-b border-white/10"><div className="max-w-6xl mx-auto flex justify-between items-center"><div className="flex items-center gap-3"><img src={icon} className="w-10 h-10 rounded-full bg-white" /><span className="font-black text-xl tracking-[0.2em]">LOCATE</span><span className="text-[10px] bg-yellow-400 text-black px-2.5 py-1 rounded-full font-black">UG</span></div><div className="flex gap-2"><button onClick={()=>setShowAdmin(true)} className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold">⚙️ Admin</button><button onClick={handleInstallApp} className="bg-white text-[#0B1220] px-3 py-1.5 rounded-full text-xs font-black hidden md:flex border-2 border-yellow-400">📲 Download</button><button onClick={()=>{trackVisit('open_pay_modal'); setShowPay(true)}} className="bg-yellow-400 text-black px-4 py-1.5 rounded-full text-xs font-black animate-pulse">💳 Pay AD</button></div></div></div>
      <div className="bg-[#111a2e] border-y border-yellow-400/20 overflow-hidden py-2.5 sticky top-[56px] z-20"><div className="flex items-center max-w-[100vw] overflow-hidden"><div className="bg-yellow-400 text-black px-5 py-1.5 text-[10px] font-black whitespace-nowrap z-10 flex items-center gap-2">🔥 TRENDING ADS ● LIVE</div><div className="flex-1 overflow-hidden"><div className="animate-marquee">{[...sponsoredAds,...sponsoredAds,...sponsoredAds].map((ad, idx) => (<span key={idx} className="flex items-center gap-3 text-xs whitespace-nowrap text-white mx-6"><span className="bg-yellow-400 text-black px-2.5 py-0.5 rounded-full text-[9px] font-black">AD</span><span className="font-black">{ad.name}</span><span className="text-slate-400">• {ad.area}</span><span className="text-yellow-400 font-bold">• {ad.price}</span><span className="text-white/20 mx-2">|</span></span>))}</div></div></div></div>
      <div className="max-w-6xl mx-auto p-4 w-full flex-1">
        <div className="relative"><input value={search} onChange={e=>{setSearch(e.target.value); if(e.target.value.length>2) trackVisit('search', null, e.target.value)}} placeholder="🔍 Search Cafe Javas, Serena, Ntinda..." className="w-full p-3.5 pl-5 rounded-full border border-slate-200 bg-white text-slate-800 outline-none shadow-sm" /></div>
        <div className="flex gap-2 overflow-x-auto pb-3 mt-5 scrollbar-hide">{categories.map(cat => (<button key={cat.id} onClick={() => {setCategory(cat.id); trackVisit('category_'+cat.id)}} className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap text-sm ${category===cat.id? 'bg-[#0B1220] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{cat.emoji} {cat.label}</button>))}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">{filtered.map(place => (<div key={place.id} className={`bg-white rounded-[20px] overflow-hidden border shadow-sm ${place.sponsored? 'border-yellow-400/50 ring-2 ring-yellow-400/20' : 'border-slate-200'}`}><div className="relative"><img src={place.image} className="w-full h-52 object-cover" /><div className="absolute top-3 left-3 bg-[#0B1220]/85 px-3 py-1 rounded-full text-xs font-bold text-white">{place.area}</div><div className="absolute top-3 right-3 flex gap-1.5"><button onClick={()=>toggleFav(place.id)} className={`w-9 h-9 rounded-full flex items-center justify-center ${favourites.includes(place.id)? 'bg-red-500' : 'bg-black/60'}`}>{favourites.includes(place.id)? '❤️':'🤍'}</button><button onClick={()=>sharePlace(place)} className="w-9 h-9 bg-black/60 rounded-full text-white">↗️</button></div>{place.sponsored && <div className="absolute bottom-3 left-3 bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black">AD</div>}</div><div className="p-5"><div className="flex justify-between"><h3 className="font-black text-[15px] w-[70%]">{place.name}</h3><span className="text-xs bg-[#eef2ff] px-2.5 py-1 rounded-full text-blue-700 font-bold">⭐ {place.rating}</span></div><p className="text-xs text-slate-500 mt-1">{place.price} • {place.payment_status}</p><div className="flex gap-1.5 flex-wrap mt-3">{place.badges?.slice(0,3).map(b=>(<span key={b} className="text-[10px] bg-[#f1f5f9] border px-2.5 py-1 rounded-full text-slate-600">{b}</span>))}</div><div className="grid grid-cols-2 gap-2.5 mt-4"><button onClick={()=>{trackVisit('view_business', place.name); setSelectedPlace(place)}} className="bg-[#0B1220] text-white py-3 rounded-xl font-black text-sm">Directions →</button><button onClick={()=>sharePlace(place)} className="bg-white border py-3 rounded-xl font-bold text-sm">Share ↗️</button></div></div></div>))}</div>
      </div>
      {selectedPlace && (<div className="fixed inset-0 bg-[#0B1220]/80 z-50 flex items-end md:items-center justify-center p-4"><div className="bg-white w-full max-w-md rounded-[24px] p-6"><h2 className="font-black text-xl">{selectedPlace.name}</h2><p className="text-sm text-slate-500">{selectedPlace.area}</p><a href={`https://www.google.com/maps/search/${selectedPlace.name} Kampala`} target="_blank" className="mt-5 block text-center w-full bg-[#0B1220] text-white py-3.5 rounded-xl font-black">Open in Maps 🗺️</a><button onClick={()=>setSelectedPlace(null)} className="mt-2 w-full bg-slate-100 py-3 rounded-xl font-bold">Close</button></div></div>)}
      {showPay && (<div className="fixed inset-0 bg-[#0B1220]/90 z-[10000] flex items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-[24px] p-6"><h2 className="font-black text-xl">💳 Pay for AD</h2><div className="bg-yellow-400 text-black p-3 rounded-xl my-3 text-xs font-bold">MTN MoMo: 0781675995<br/>Barnabas Muhumuza</div><input value={payForm.businessName} onChange={e=>setPayForm({...payForm, businessName:e.target.value})} placeholder="Business Name" className="w-full p-3 bg-slate-50 border rounded-xl mt-2" /><input value={payForm.phone} onChange={e=>setPayForm({...payForm, phone:e.target.value})} placeholder="MoMo Phone" className="w-full p-3 bg-slate-50 border rounded-xl mt-2" /><select value={payForm.plan} onChange={e=>setPayForm({...payForm, plan:e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl mt-2"><option value="50000">1 Month - 50k</option><option value="120000">3 Months - 120k</option><option value="200000">6 Months - 200k</option></select><button onClick={handleCustomerPay} className="w-full bg-[#0B1220] text-white py-4 rounded-xl font-black mt-3">✅ I Have Paid</button><button onClick={()=>setShowPay(false)} className="w-full mt-2 text-sm text-slate-500">Cancel</button></div></div>)}
      {showMessageBox && (<div className="fixed top-1/2 -translate-y-1/2 right-4 md:right-6 w-[90%] md:w-[380px] h-[480px] bg-white border rounded-[20px] shadow-2xl z-[9999] flex flex-col overflow-hidden"><div className="bg-[#0B1220] p-4 flex justify-between items-center"><div className="flex items-center gap-3"><img src={icon} className="w-9 h-9 rounded-full bg-white" /><div><p className="font-black text-sm text-white">Locabarnes</p><p className="text-[10px] text-emerald-400">● Online</p></div></div><button onClick={()=>setShowMessageBox(false)} className="w-8 h-8 rounded-full bg-white/10 text-white">✕</button></div><div className="flex-1 p-3 overflow-y-auto bg-[#f8fafc] space-y-2">{chatMessages.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`${m.from==='user'?'bg-[#0B1220] text-white':'bg-white border'} px-3 py-2 rounded-[12px] max-w-[80%] text-[13px]`}>{m.text}</div></div>))}</div><div className="p-3 bg-white border-t"><div className="flex gap-2"><input value={userMessage.message} onChange={e=>setUserMessage({...userMessage, message:e.target.value})} onKeyDown={e=>e.key==='Enter'&&sendUserMessage()} placeholder="Type a message..." className="flex-1 p-3 bg-slate-50 border rounded-full text-sm outline-none" /><button onClick={sendUserMessage} className="bg-[#0B1220] text-white w-11 h-11 rounded-full">➤</button></div></div></div>)}
      <button onClick={()=>setShowMessageBox(!showMessageBox)} className="fixed top-1/2 -translate-y-1/2 right-0 bg-[#0B1220] text-white px-3 py-6 rounded-l-[16px] font-black text-sm shadow z-[9998] border border-white/10 border-r-0">💬<br/>M<br/>S<br/>G</button>
      <footer className="bg-[#0B1220] border-t border-white/10 mt-12"><div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8"><div><div className="flex items-center gap-2 mb-3"><img src={icon} className="w-8 h-8 rounded-full bg-white" /><h2 className="text-xl font-black text-white">LocateUG</h2></div><p className="text-sm text-slate-300">LocateUG helps you find businesses near you in Uganda.</p><div className="mt-4 bg-white text-[#0B1220] px-4 py-2 rounded-full inline-block text-sm font-black">Total Places: {totalPlaces}+ Live • {visits.length} visits tracked</div></div><div><h3 className="font-black text-white mb-3">Our Offers</h3><ul className="space-y-2 text-sm text-slate-300"><li>✓ Business Listing</li><li>✓ Lost & Found</li><li>✓ Hotels & Restaurants</li><li className="text-yellow-400 font-bold">✓ Trending Paid AD</li></ul></div><div><h3 className="font-black text-white mb-3">Contact</h3><ul className="space-y-2 text-sm text-slate-300"><li>📍 Kampala, Uganda</li><li>📞 +256 781 675 995</li><li>✉️ hello@locateug.com</li><li>💳 MTN MoMo: 0781675995</li></ul></div><div><h3 className="font-black text-white mb-3">Quick Links</h3><div className="mt-4 flex gap-2 flex-wrap"><a href="https://wa.me/256781675995" target="_blank" className="bg-[#25D366] text-white px-3 py-1.5 rounded-full text-xs font-bold">WhatsApp</a><button onClick={handleInstallApp} className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-black border-2 border-yellow-400 animate-pulse">📲 Download App</button></div></div></div><div className="border-t border-white/10 bg-[#080e1c] py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} LOCATEUG PRO • {totalPlaces} Places • {visits.length} Visits Tracked • Kampala, Uganda</div></footer>
    </div>
  )
}
export default App