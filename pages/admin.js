import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const ADM_KEY = 'tz_adm_tok'

export default function AdminPage() {
  const [tok, setTok] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('tests')
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ txt:'', ok:true })
  const [editTest, setEditTest] = useState(null)
  const [newFolder, setNewFolder] = useState('')

  // Zip upload state
  const [zipFile, setZipFile] = useState(null)
  const [zipUploading, setZipUploading] = useState(false)
  const [zipResult, setZipResult] = useState(null)
  const [zipDrag, setZipDrag] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem(ADM_KEY)
    if (t) { setTok(t); setLoggedIn(true); loadTests(t) }
  }, [])

  const adm = async (action, body, t) => {
    const tk = t || tok
    const r = await fetch(`/api/admin/ops?action=${action}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk },
      body: body ? JSON.stringify(body) : undefined
    })
    return r.json()
  }

  const loadTests = async (t) => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/ops?action=list-tests', {
        headers: { Authorization: 'Bearer ' + (t||tok) }
      })
      const d = await r.json()
      if (Array.isArray(d)) setTests(d)
    } catch(e) {}
    setLoading(false)
  }

  const login = async () => {
    setErr('')
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    })
    const d = await r.json()
    if (d.error) { setErr(d.error); return }
    localStorage.setItem(ADM_KEY, d.token)
    setTok(d.token); setLoggedIn(true); loadTests(d.token)
  }

  const logout = () => { localStorage.removeItem(ADM_KEY); setLoggedIn(false); setTok('') }

  const flash = (txt, ok=true) => {
    setMsg({ txt, ok })
    setTimeout(() => setMsg({ txt:'', ok:true }), 3500)
  }

  const saveTest = async () => {
    if (!editTest) return
    const d = await adm('rename-test', editTest)
    if (d.ok) { flash('✅ Saved!'); setEditTest(null); loadTests() }
    else flash('❌ ' + d.error, false)
  }

  const delTestMsg = (p) => {
    alert('⚠️ Vercel filesystem is read-only.\n\nTo delete a test:\n1. Open your GitHub repo\n2. Delete: public/tests/' + p + '\n3. Commit & push → Vercel redeploys')
  }

  // ── ZIP UPLOAD ─────────────────────────────────────────────────────────────
  const uploadZip = async () => {
    if (!zipFile) return
    setZipUploading(true)
    setZipResult(null)
    try {
      const formData = new FormData()
      formData.append('zip', zipFile)
      const r = await fetch('/api/admin/upload-zip', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok },
        body: formData
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Upload failed')
      setZipResult(d)
      if (d.added > 0) { loadTests(); flash(`✅ Added ${d.added} test(s) from zip!`) }
      else flash('⚠️ No valid test JSON files found in zip', false)
    } catch(e) {
      setZipResult({ error: e.message })
      flash('❌ ' + e.message, false)
    }
    setZipUploading(false)
    setZipFile(null)
  }

  const handleZipDrop = (e) => {
    e.preventDefault(); setZipDrag(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.zip') || f.type === 'application/zip' || f.type === 'application/x-zip-compressed')) {
      setZipFile(f); setZipResult(null)
    } else {
      flash('⚠️ Please drop a .zip file', false)
    }
  }

  const folders = [...new Set(tests.map(t => t.path.includes('/') ? t.path.split('/')[0] : '(root)'))]

  const COLORS = ['#1a237e','#1b5e20','#b71c1c','#4a148c','#e65100','#006064','#37474f']

  if (!loggedIn) return (
    <>
      <Head>
        <title>TestZyro Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#f5f5f5;font-family:'Roboto',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
        .box{background:white;border:1px solid #e0e0e0;border-radius:10px;padding:36px;width:380px;display:flex;flex-direction:column;gap:14px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
        .logo{display:flex;align-items:center;gap:10px;margin-bottom:4px}
        .logo-mark{width:36px;height:36px;background:#1a237e;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ffeb3b;font-family:'Roboto Mono',monospace;font-weight:700;font-size:.85rem}
        .title{font-size:1.4rem;font-weight:700;color:#1a237e}
        .sub{font-size:.8rem;color:#888}
        .f{width:100%;background:#f5f5f5;border:1.5px solid #ddd;border-radius:6px;padding:10px 13px;color:#212121;font-family:'Roboto',sans-serif;font-size:.88rem;outline:none}
        .f:focus{border-color:#1a237e}
        .b{background:#1a237e;color:white;border:none;padding:12px;border-radius:6px;font-family:'Roboto',sans-serif;font-weight:700;cursor:pointer;font-size:.9rem}
        .b:hover{background:#283593}
        .e{color:#c62828;font-size:.76rem;background:#ffebee;border:1px solid #ef9a9a;padding:8px 12px;border-radius:6px}
      `}</style>
      <div className="box">
        <div className="logo">
          <div className="logo-mark">TZ</div>
          <div><div className="title">TestZyro Admin</div><div className="sub">Control Panel</div></div>
        </div>
        <input className="f" type="email" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input className="f" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>
        {err && <div className="e">{err}</div>}
        <button className="b" onClick={login}>Sign In</button>
      </div>
    </>
  )

  return (
    <>
      <Head>
        <title>TestZyro Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{CSS}</style>

      <header className="hdr">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="logo-mark">TZ</div>
          <div>
            <div style={{fontWeight:700,fontSize:'1rem',color:'#1a237e'}}>TestZyro <span style={{color:'#e65100'}}>Admin</span></div>
            <div style={{fontSize:'.65rem',color:'#888',fontFamily:'Roboto Mono,monospace'}}>{tests.length} tests loaded</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <a href="/" className="abtn">← Back to Site</a>
          <button className="abtn" onClick={()=>loadTests()}>🔄 Refresh</button>
          <button className="abtn danger" onClick={logout}>Sign Out</button>
        </div>
      </header>

      {msg.txt && (
        <div style={{position:'fixed',top:68,left:'50%',transform:'translateX(-50%)',background:msg.ok?'#e8f5e9':'#ffebee',border:`1px solid ${msg.ok?'#a5d6a7':'#ef9a9a'}`,color:msg.ok?'#1b5e20':'#c62828',padding:'9px 20px',borderRadius:8,fontWeight:600,fontSize:'.82rem',zIndex:999,whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(0,0,0,.15)'}}>
          {msg.txt}
        </div>
      )}

      <div className="wrap">
        <div className="tabs">
          {[['tests','📋 Tests'],['upload-zip','📦 Upload ZIP'],['info','ℹ️ Info']].map(([t,l])=>(
            <button key={t} className={`tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>

        {loading && <div style={{color:'#888',padding:'20px 0',textAlign:'center',fontFamily:'Roboto Mono,monospace',fontSize:'.82rem'}}>Loading…</div>}

        {/* ── TESTS ── */}
        {tab==='tests' && !loading && (
          <div>
            <div className="sec-title">📋 All Tests ({tests.length})</div>
            {tests.length===0 && <div style={{color:'#888',padding:'16px 0',fontSize:'.84rem'}}>No tests found in public/tests/</div>}
            {folders.map(folder => {
              const ft = tests.filter(t => (t.path.includes('/') ? t.path.split('/')[0] : '(root)') === folder)
              return (
                <div key={folder} style={{marginBottom:22}}>
                  <div style={{fontSize:'.72rem',fontFamily:'Roboto Mono,monospace',color:'#1a237e',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    📁 {folder} <span style={{color:'#888'}}>({ft.length})</span>
                    <div style={{flex:1,height:1,background:'#e0e0e0'}}/>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {ft.map(t => (
                      <div key={t.path} className="test-row">
                        <div style={{width:5,borderRadius:'3px 0 0 3px',alignSelf:'stretch',background:t.accentColor||'#1a237e',flexShrink:0}}/>
                        <div style={{flex:1,padding:'10px 14px',minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:'.88rem',color:'#212121',marginBottom:2}}>{t.title}</div>
                          <div style={{fontSize:'.66rem',color:'#888',fontFamily:'Roboto Mono,monospace'}}>
                            {t.path} &nbsp;·&nbsp; {t.questionCount} Qs &nbsp;·&nbsp; {t.subject} &nbsp;·&nbsp; +{t.mCor}/−{t.mNeg} &nbsp;·&nbsp; {t.dur}min
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6,padding:'10px 12px',flexShrink:0}}>
                          <button className="abtn" style={{fontSize:'.7rem'}} onClick={()=>setEditTest({...t})}>✏️ Edit</button>
                          <button className="abtn danger" style={{fontSize:'.7rem'}} onClick={()=>delTestMsg(t.path)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ZIP UPLOAD ── */}
        {tab==='upload-zip' && (
          <div>
            <div className="sec-title">📦 Upload Tests via ZIP</div>

            <div className="info-box blue" style={{marginBottom:18}}>
              <div style={{fontWeight:700,color:'#1565c0',marginBottom:8}}>📦 How ZIP upload works</div>
              <div style={{fontSize:'.82rem',color:'#333',lineHeight:1.8}}>
                1. Create a <code>.zip</code> file containing your <code>.json</code> test files<br/>
                2. You can organize them in subfolders (e.g., <code>BITSAT/test1.json</code>)<br/>
                3. Drop the ZIP here and click Upload<br/>
                4. Tests appear instantly in the library ✅
              </div>
            </div>

            <div
              className={`zip-zone${zipDrag?' drag':''}`}
              onDragOver={e=>{e.preventDefault();setZipDrag(true)}}
              onDragLeave={()=>setZipDrag(false)}
              onDrop={handleZipDrop}
            >
              {zipFile ? (
                <div>
                  <div style={{fontSize:'2rem',marginBottom:8}}>📦</div>
                  <div style={{fontWeight:700,color:'#1a237e',marginBottom:4}}>{zipFile.name}</div>
                  <div style={{fontSize:'.74rem',color:'#888',marginBottom:16}}>{(zipFile.size/1024/1024).toFixed(2)} MB</div>
                  <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                    <button className="abtn accent" onClick={uploadZip} disabled={zipUploading} style={{padding:'10px 24px',fontSize:'.86rem'}}>
                      {zipUploading ? '⏳ Uploading…' : '📤 Upload ZIP'}
                    </button>
                    <button className="abtn" onClick={()=>{setZipFile(null);setZipResult(null)}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:'2.5rem',marginBottom:10}}>📦</div>
                  <div style={{fontWeight:700,color:'#212121',fontSize:'1rem',marginBottom:6}}>Drop your ZIP file here</div>
                  <div style={{fontSize:'.78rem',color:'#888',marginBottom:16}}>or click to browse</div>
                  <label htmlFor="zip-inp" className="abtn accent" style={{cursor:'pointer',display:'inline-block',padding:'9px 24px'}}>
                    Choose ZIP File
                  </label>
                  <input id="zip-inp" type="file" accept=".zip,application/zip" style={{display:'none'}}
                    onChange={e=>{const f=e.target.files[0];if(f){setZipFile(f);setZipResult(null)}}}/>
                </div>
              )}
            </div>

            {zipResult && (
              <div className={`info-box ${zipResult.error?'red':'green'}`} style={{marginTop:16}}>
                {zipResult.error ? (
                  <div>❌ <strong>Error:</strong> {zipResult.error}</div>
                ) : (
                  <div>
                    <div style={{fontWeight:700,marginBottom:8}}>✅ Upload Complete</div>
                    <div style={{fontSize:'.83rem',lineHeight:1.9}}>
                      <span style={{color:'#1b5e20',fontWeight:700}}>✓ Added: {zipResult.added} test(s)</span><br/>
                      {zipResult.skipped>0 && <span style={{color:'#e65100'}}>⊘ Skipped (invalid): {zipResult.skipped}<br/></span>}
                      {zipResult.errors?.length>0 && <span style={{color:'#c62828'}}>Errors: {zipResult.errors.join(', ')}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="info-box" style={{marginTop:18}}>
              <div style={{fontWeight:700,marginBottom:8}}>📄 JSON format for each test file</div>
              <pre className="code-block">{`{
  "title": "BITSAT Mock Test 3",
  "subject": "BITSAT",
  "dur": 180,
  "mCor": 3,
  "mNeg": 1,
  "questions": [
    {
      "subject": "Physics",
      "type": "MCQ",
      "text": "Question text...",
      "opts": ["Option A", "Option B", "Option C", "Option D"],
      "ans": "B"
    }
  ]
}`}</pre>
            </div>
          </div>
        )}

        {/* ── INFO ── */}
        {tab==='info' && (
          <div>
            <div className="sec-title">ℹ️ Platform Info</div>
            <div className="info-box blue" style={{marginBottom:14}}>
              <div style={{fontWeight:700,color:'#1565c0',marginBottom:8}}>🌐 TestZyro v3.0 — BITSAT CBT Platform</div>
              <div style={{fontSize:'.83rem',lineHeight:2,color:'#333'}}>
                <b>Test Count:</b> {tests.length} tests loaded<br/>
                <b>Subjects:</b> BITSAT (Physics, Chemistry, Maths, English & LR)<br/>
                <b>Features:</b> Full CBT mode, BITSAT subject navigator, Output file download, Test analyser<br/>
                <b>To add tests:</b> Upload a ZIP via the Upload ZIP tab, or manually add JSON to <code>public/tests/</code>
              </div>
            </div>
            <div className="info-box">
              <div style={{fontWeight:700,marginBottom:8}}>📁 Folder structure</div>
              <pre className="code-block">{`public/
  tests/
    BITSAT/
      bitsat_paper_1.json
      bitsat_paper_2.json
    NEET/
      neet_mock_1.json`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Edit Test Modal */}
      {editTest && (
        <div className="modal-ov" onClick={()=>setEditTest(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:'1.05rem',marginBottom:16,color:'#1a237e'}}>✏️ Edit Test</div>
            <div className="afl">Title</div>
            <input className="afield" value={editTest.title} onChange={e=>setEditTest({...editTest,title:e.target.value})}/>
            <div className="afl">Subject</div>
            <select className="afield" value={editTest.subject} onChange={e=>setEditTest({...editTest,subject:e.target.value})}>
              {['BITSAT','JEE','NEET','GATE','Board','Other'].map(s=><option key={s}>{s}</option>)}
            </select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><div className="afl">Duration (min)</div><input className="afield" type="number" value={editTest.dur} onChange={e=>setEditTest({...editTest,dur:e.target.value})}/></div>
              <div><div className="afl">Sort Order</div><input className="afield" type="number" value={editTest.order} onChange={e=>setEditTest({...editTest,order:e.target.value})}/></div>
              <div><div className="afl">Marks Correct</div><input className="afield" type="number" value={editTest.mCor} onChange={e=>setEditTest({...editTest,mCor:e.target.value})}/></div>
              <div><div className="afl">Marks Wrong (−)</div><input className="afield" type="number" value={editTest.mNeg} onChange={e=>setEditTest({...editTest,mNeg:e.target.value})}/></div>
            </div>
            <div className="afl">Card Accent Color</div>
            <div style={{display:'flex',gap:7,marginBottom:6,flexWrap:'wrap'}}>
              {COLORS.map(c=><div key={c} onClick={()=>setEditTest({...editTest,accentColor:c})} style={{width:26,height:26,borderRadius:6,background:c,cursor:'pointer',outline:editTest.accentColor===c?'3px solid #ffeb3b':'none',outlineOffset:2}}/>)}
            </div>
            <input className="afield" placeholder="#1a237e" value={editTest.accentColor||''} onChange={e=>setEditTest({...editTest,accentColor:e.target.value})}/>
            <div style={{display:'flex',gap:8,marginTop:6}}>
              <button className="abtn accent" style={{flex:1}} onClick={saveTest}>💾 Save</button>
              <button className="abtn" onClick={()=>setEditTest(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f5f5f5;color:#212121;font-family:'Roboto',sans-serif;min-height:100vh}
.hdr{background:white;border-bottom:2px solid #e0e0e0;padding:12px 26px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 6px rgba(0,0,0,.08);position:sticky;top:0;z-index:50}
.logo-mark{width:34px;height:34px;background:#1a237e;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Roboto Mono',monospace;font-weight:700;font-size:.8rem;color:#ffeb3b}
.wrap{max-width:960px;margin:0 auto;padding:26px 18px 80px}
.tabs{display:flex;align-items:center;gap:6px;margin-bottom:22px;flex-wrap:wrap}
.tab{padding:8px 18px;border-radius:6px;font-family:'Roboto',sans-serif;font-weight:600;font-size:.82rem;cursor:pointer;border:1.5px solid #ddd;background:white;color:#666;transition:all .14s}
.tab.on{background:#1a237e;color:white;border-color:#1a237e}
.sec-title{font-size:.68rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;display:flex;align-items:center;gap:10px;font-family:'Roboto Mono',monospace}
.sec-title::after{content:'';flex:1;height:1px;background:#e0e0e0}
.test-row{background:white;border:1px solid #e0e0e0;border-radius:8px;display:flex;align-items:center;overflow:hidden;transition:border-color .14s;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.test-row:hover{border-color:#1a237e}
.abtn{background:white;border:1px solid #ccc;color:#212121;padding:7px 13px;border-radius:6px;font-family:'Roboto',sans-serif;font-weight:600;font-size:.78rem;cursor:pointer;transition:all .14s;text-decoration:none;display:inline-block}
.abtn:hover{border-color:#888}
.abtn.accent{background:#1a237e;color:white;border:none}
.abtn.accent:hover{background:#283593}
.abtn.accent:disabled{opacity:.5;cursor:not-allowed}
.abtn.danger{background:#ffebee;border-color:#ef9a9a;color:#c62828}
.abtn.danger:hover{background:#ffcdd2}
.afield{width:100%;background:#f5f5f5;border:1.5px solid #ddd;border-radius:6px;padding:9px 11px;color:#212121;font-family:'Roboto',sans-serif;font-size:.83rem;outline:none;transition:border-color .2s;margin-bottom:10px}
.afield:focus{border-color:#1a237e}
.afl{font-size:.66rem;color:#888;font-family:'Roboto Mono',monospace;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.zip-zone{background:white;border:2px dashed #ccc;border-radius:10px;padding:40px 24px;text-align:center;transition:all .22s;margin-bottom:4px}
.zip-zone.drag,.zip-zone:hover{border-color:#1a237e;background:#e8eaf6}
.info-box{background:white;border:1px solid #e0e0e0;border-radius:8px;padding:16px 18px}
.info-box.blue{background:#e3f2fd;border-color:#90caf9}
.info-box.green{background:#e8f5e9;border-color:#a5d6a7}
.info-box.red{background:#ffebee;border-color:#ef9a9a}
.code-block{background:#f5f5f5;border-radius:6px;padding:12px;font-size:.72rem;color:#1b5e20;overflow-x:auto;font-family:'Roboto Mono',monospace;line-height:1.7;margin-top:6px}
.modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:white;border:1px solid #e0e0e0;border-radius:12px;padding:24px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.15)}
`
