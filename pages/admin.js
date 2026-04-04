import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const ADM_KEY = 'tz_adm_tok'
const COLORS = ['#1a237e','#1b5e20','#b71c1c','#4a148c','#e65100','#006064','#37474f']

export default function AdminPage() {
  const [tok, setTok]         = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [tab, setTab]         = useState('upload')
  const [tests, setTests]     = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState({ txt:'', ok:true })
  const [editTest, setEditTest] = useState(null)

  // BITSAT zip processor state
  const [zipFile, setZipFile]   = useState(null)
  const [testName, setTestName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]   = useState('')
  const [result, setResult]       = useState(null)
  const [zipDrag, setZipDrag]     = useState(false)
  const zipInputRef = useRef()

  // Generic zip state
  const [gZipFile, setGZipFile]   = useState(null)
  const [gZipResult, setGZipResult] = useState(null)
  const [gZipUploading, setGZipUploading] = useState(false)
  const [gZipDrag, setGZipDrag]   = useState(false)
  const gZipRef = useRef()

  useEffect(() => {
    const t = localStorage.getItem(ADM_KEY)
    if (t) { setTok(t); setLoggedIn(true); loadTests(t) }
  }, [])

  const adm = async (action, body, t) => {
    const tk = t || tok
    const r = await fetch(`/api/admin/ops?action=${action}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+tk },
      body: body ? JSON.stringify(body) : undefined
    })
    return r.json()
  }

  const loadTests = async (t) => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/ops?action=list-tests', { headers:{ Authorization:'Bearer '+(t||tok) } })
      const d = await r.json()
      if (Array.isArray(d)) setTests(d)
    } catch(e) {}
    setLoading(false)
  }

  const login = async () => {
    setLoginErr('')
    const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password:pass}) })
    const d = await r.json()
    if (d.error) { setLoginErr(d.error); return }
    localStorage.setItem(ADM_KEY, d.token)
    setTok(d.token); setLoggedIn(true); loadTests(d.token)
  }
  const logout = () => { localStorage.removeItem(ADM_KEY); setLoggedIn(false); setTok('') }
  const flash = (txt, ok=true) => { setMsg({txt,ok}); setTimeout(()=>setMsg({txt:'',ok:true}),3500) }

  const saveTest = async () => {
    const d = await adm('rename-test', editTest)
    if (d.ok) { flash('✅ Saved!'); setEditTest(null); loadTests() }
    else flash('❌ '+d.error, false)
  }

  // ── BITSAT ZIP PROCESSOR ──────────────────────────────────────────────────
  const handleBitsatZip = (file) => {
    if (!file || !file.name.endsWith('.zip')) { flash('Please select a .zip file', false); return }
    setZipFile(file)
    setResult(null)
    // Auto-fill test name from filename
    const name = file.name.replace(/\.zip$/i,'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
    setTestName(name)
  }

  const processBitsatZip = async () => {
    if (!zipFile || !testName.trim()) return
    setProcessing(true); setResult(null); setProgress('Uploading zip...')
    try {
      const fd = new FormData()
      fd.append('zip', zipFile)
      fd.append('testName', testName.trim())
      setProgress('Processing questions and images...')
      const r = await fetch('/api/admin/process-zip', {
        method:'POST',
        headers:{ Authorization:'Bearer '+tok },
        body: fd
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Processing failed')
      setResult({ ok:true, ...d })
      flash(`✅ "${d.title}" added — ${d.questions} questions!`)
      loadTests()
      setZipFile(null); setTestName('')
    } catch(e) {
      setResult({ ok:false, error:e.message })
      flash('❌ '+e.message, false)
    }
    setProcessing(false); setProgress('')
  }

  // ── GENERIC ZIP (raw JSON zips) ───────────────────────────────────────────
  const uploadGenericZip = async () => {
    if (!gZipFile) return
    setGZipUploading(true); setGZipResult(null)
    try {
      const fd = new FormData()
      fd.append('zip', gZipFile)
      const r = await fetch('/api/admin/upload-zip', { method:'POST', headers:{ Authorization:'Bearer '+tok }, body:fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Upload failed')
      setGZipResult(d)
      if (d.added > 0) { loadTests(); flash(`✅ Added ${d.added} test(s)!`) }
      else flash('No valid JSON test files found', false)
    } catch(e) {
      setGZipResult({ error:e.message })
      flash('❌ '+e.message, false)
    }
    setGZipUploading(false); setGZipFile(null)
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!loggedIn) return (
    <>
      <Head><title>TestZyro Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`${BASE_CSS}
        .login-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0d1b4b,#1a237e)}
        .login-card{background:white;border-radius:20px;padding:44px 40px;width:380px;display:flex;flex-direction:column;gap:14px;box-shadow:0 24px 80px rgba(0,0,0,.3)}
        .login-logo{display:flex;align-items:center;gap:10px;margin-bottom:6px}
        .login-mark{width:40px;height:40px;background:#1a237e;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#ffeb3b;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:.9rem}
        .login-title{font-size:1.5rem;font-weight:800;color:#1a237e}
        .login-sub{font-size:.8rem;color:#888;margin-top:-8px}
        .login-field{width:100%;background:#f5f7ff;border:1.5px solid #e0e0e0;border-radius:10px;padding:11px 14px;color:#212121;font-family:'Inter',sans-serif;font-size:.88rem;outline:none}
        .login-field:focus{border-color:#1a237e}
        .login-btn{background:linear-gradient(135deg,#1a237e,#283593);color:white;border:none;padding:13px;border-radius:10px;font-family:'Inter',sans-serif;font-weight:700;cursor:pointer;font-size:.92rem}
        .login-btn:hover{opacity:.9}
        .login-err{background:#ffebee;border:1px solid #ef9a9a;border-radius:8px;padding:10px 13px;font-size:.78rem;color:#c62828}
      `}</style>
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-mark">TZ</div>
            <div><div className="login-title">Admin Panel</div><div className="login-sub">TestZyro Control Centre</div></div>
          </div>
          <input className="login-field" type="email" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/>
          <input className="login-field" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>
          {loginErr && <div className="login-err">{loginErr}</div>}
          <button className="login-btn" onClick={login}>Sign In →</button>
        </div>
      </div>
    </>
  )

  const folders = [...new Set(tests.map(t => t.path.includes('/') ? t.path.split('/')[0] : '(root)'))]

  // ── Admin panel ───────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>TestZyro Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`${BASE_CSS}${PANEL_CSS}`}</style>

      <header className="adm-header">
        <div className="adm-logo">
          <div className="adm-mark">TZ</div>
          <div>
            <div className="adm-title">TestZyro <span style={{color:'#ffeb3b'}}>Admin</span></div>
            <div className="adm-sub">{tests.length} tests loaded</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <a href="/" className="adm-btn">← Site</a>
          <button className="adm-btn" onClick={()=>loadTests()}>🔄</button>
          <button className="adm-btn danger" onClick={logout}>Sign Out</button>
        </div>
      </header>

      {msg.txt && (
        <div className={`toast ${msg.ok?'ok':'err'}`}>{msg.txt}</div>
      )}

      <div className="adm-layout">
        {/* Sidebar */}
        <div className="adm-sidebar">
          {[
            ['upload','📦 BITSAT ZIP'],
            ['tests','📋 Tests'],
            ['json-zip','🗂️ JSON ZIP'],
          ].map(([t,l])=>(
            <button key={t} className={`sidebar-btn${tab===t?' active':''}`} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>

        {/* Main content */}
        <div className="adm-main">

          {/* ── BITSAT ZIP UPLOAD ── */}
          {tab==='upload' && (
            <div className="content-section">
              <div className="content-title">📦 Add BITSAT Test from ZIP</div>
              <div className="content-sub">Upload a BITSAT paper zip file — questions with images auto-imported</div>

              {/* Format info */}
              <div className="format-card">
                <div className="format-card-title">📋 Expected ZIP Format</div>
                <div className="format-grid">
                  <div className="format-file">
                    <div className="format-icon">📄</div>
                    <div><div className="format-name">data.json</div><div className="format-desc">Contains pdfCropperData + testAnswerKey</div></div>
                  </div>
                  <div className="format-file">
                    <div className="format-icon">🖼️</div>
                    <div><div className="format-name">Subject__--__QNum__--__1.png</div><div className="format-desc">Question images (e.g. Maths__--__5__--__1.png)</div></div>
                  </div>
                </div>
                <div className="format-subjects">
                  {['Physics','Chemistry','Maths','English & LR'].map(s=>(
                    <span key={s} className="subj-pill">{s}</span>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={`big-dropzone${zipDrag?' drag':''}`}
                onDragOver={e=>{e.preventDefault();setZipDrag(true)}}
                onDragLeave={()=>setZipDrag(false)}
                onDrop={e=>{e.preventDefault();setZipDrag(false);handleBitsatZip(e.dataTransfer.files[0])}}
                onClick={()=>!zipFile&&zipInputRef.current.click()}
              >
                {!zipFile ? (
                  <>
                    <div className="dz-big-icon">📦</div>
                    <div className="dz-big-title">Drop BITSAT ZIP here</div>
                    <div className="dz-big-sub">or click to browse · Max 200MB</div>
                    <button className="dz-browse-btn" onClick={e=>{e.stopPropagation();zipInputRef.current.click()}}>Browse ZIP File</button>
                  </>
                ) : (
                  <div className="file-selected">
                    <div className="file-icon">📦</div>
                    <div className="file-info">
                      <div className="file-name">{zipFile.name}</div>
                      <div className="file-size">{(zipFile.size/1024/1024).toFixed(2)} MB</div>
                    </div>
                    <button className="file-remove" onClick={e=>{e.stopPropagation();setZipFile(null);setResult(null);setTestName('')}}>✕</button>
                  </div>
                )}
                <input ref={zipInputRef} type="file" accept=".zip" style={{display:'none'}} onChange={e=>{if(e.target.files[0])handleBitsatZip(e.target.files[0])}}/>
              </div>

              {/* Test name + submit */}
              {zipFile && (
                <div className="submit-row">
                  <div className="name-field-wrap">
                    <label className="field-label">Test Name</label>
                    <input className="name-field" value={testName} onChange={e=>setTestName(e.target.value)} placeholder="e.g. BITSAT 2024 Paper 11"/>
                  </div>
                  <button className="process-btn" onClick={processBitsatZip} disabled={processing||!testName.trim()}>
                    {processing ? (
                      <><span className="spinner"/>Processing...</>
                    ) : '⚡ Process & Add Test'}
                  </button>
                </div>
              )}

              {/* Progress */}
              {processing && progress && (
                <div className="progress-card">
                  <div className="progress-bar"><div className="progress-fill"/></div>
                  <div className="progress-label">{progress}</div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={`result-card ${result.ok?'ok':'err'}`}>
                  {result.ok ? (
                    <>
                      <div className="result-icon">✅</div>
                      <div>
                        <div className="result-title">Test Added Successfully!</div>
                        <div className="result-detail">
                          <span className="result-badge">{result.title}</span>
                          <span className="result-badge">{result.questions} Questions</span>
                          <span className="result-badge">Saved at: {result.path}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="result-icon">❌</div>
                      <div>
                        <div className="result-title">Failed</div>
                        <div className="result-err">{result.error}</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TESTS LIST ── */}
          {tab==='tests' && (
            <div className="content-section">
              <div className="content-title">📋 All Tests ({tests.length})</div>
              {loading && <div className="loading-txt">Loading...</div>}
              {folders.map(folder => {
                const ft = tests.filter(t => (t.path.includes('/')?t.path.split('/')[0]:'(root)') === folder)
                return (
                  <div key={folder} style={{marginBottom:24}}>
                    <div className="folder-header">📁 {folder} <span style={{color:'#999',fontWeight:400}}>({ft.length})</span></div>
                    <div className="tests-list">
                      {ft.map(t => (
                        <div key={t.path} className="test-item">
                          <div className="test-item-bar" style={{background:t.accentColor||'#1a237e'}}/>
                          <div className="test-item-body">
                            <div className="test-item-title">{t.title}</div>
                            <div className="test-item-meta">
                              <span>{t.path}</span>
                              <span>·</span><span>{t.questionCount} Qs</span>
                              <span>·</span><span>{t.subject}</span>
                              <span>·</span><span>+{t.mCor}/−{t.mNeg}</span>
                              <span>·</span><span>{t.dur}min</span>
                            </div>
                          </div>
                          <button className="edit-btn" onClick={()=>setEditTest({...t})}>✏️ Edit</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {tests.length===0&&!loading&&<div className="empty-txt">No tests found. Add one via the BITSAT ZIP tab.</div>}
            </div>
          )}

          {/* ── JSON ZIP ── */}
          {tab==='json-zip' && (
            <div className="content-section">
              <div className="content-title">🗂️ Upload JSON ZIP</div>
              <div className="content-sub">Upload a zip containing pre-built .json test files</div>
              <div
                className={`big-dropzone${gZipDrag?' drag':''}`}
                onDragOver={e=>{e.preventDefault();setGZipDrag(true)}}
                onDragLeave={()=>setGZipDrag(false)}
                onDrop={e=>{e.preventDefault();setGZipDrag(false);const f=e.dataTransfer.files[0];if(f)setGZipFile(f)}}
                onClick={()=>!gZipFile&&gZipRef.current.click()}
              >
                {!gZipFile ? (
                  <>
                    <div className="dz-big-icon">🗂️</div>
                    <div className="dz-big-title">Drop ZIP with JSON test files</div>
                    <div className="dz-big-sub">Each .json must have a questions array</div>
                    <button className="dz-browse-btn" onClick={e=>{e.stopPropagation();gZipRef.current.click()}}>Browse</button>
                  </>
                ) : (
                  <div className="file-selected">
                    <div className="file-icon">🗂️</div>
                    <div className="file-info"><div className="file-name">{gZipFile.name}</div><div className="file-size">{(gZipFile.size/1024/1024).toFixed(2)} MB</div></div>
                    <button className="file-remove" onClick={e=>{e.stopPropagation();setGZipFile(null);setGZipResult(null)}}>✕</button>
                  </div>
                )}
                <input ref={gZipRef} type="file" accept=".zip" style={{display:'none'}} onChange={e=>{if(e.target.files[0])setGZipFile(e.target.files[0])}}/>
              </div>
              {gZipFile && (
                <div style={{textAlign:'center',marginTop:12}}>
                  <button className="process-btn" onClick={uploadGenericZip} disabled={gZipUploading}>
                    {gZipUploading?<><span className="spinner"/>Uploading...</>:'📤 Upload ZIP'}
                  </button>
                </div>
              )}
              {gZipResult && (
                <div className={`result-card ${gZipResult.error?'err':'ok'}`}>
                  <div className="result-icon">{gZipResult.error?'❌':'✅'}</div>
                  <div>
                    {gZipResult.error
                      ? <div className="result-err">{gZipResult.error}</div>
                      : <div><div className="result-title">Done!</div><div className="result-detail"><span className="result-badge">✓ Added: {gZipResult.added}</span>{gZipResult.skipped>0&&<span className="result-badge">Skipped: {gZipResult.skipped}</span>}</div></div>
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editTest && (
        <div className="modal-bg" onClick={()=>setEditTest(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">✏️ Edit Test</div>
            <label className="field-label">Title</label>
            <input className="name-field" value={editTest.title} onChange={e=>setEditTest({...editTest,title:e.target.value})}/>
            <label className="field-label">Subject</label>
            <select className="name-field" value={editTest.subject} onChange={e=>setEditTest({...editTest,subject:e.target.value})}>
              {['BITSAT','JEE','NEET','GATE','Board','Other'].map(s=><option key={s}>{s}</option>)}
            </select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label className="field-label">Duration (min)</label><input className="name-field" type="number" value={editTest.dur} onChange={e=>setEditTest({...editTest,dur:e.target.value})}/></div>
              <div><label className="field-label">Sort Order</label><input className="name-field" type="number" value={editTest.order} onChange={e=>setEditTest({...editTest,order:e.target.value})}/></div>
              <div><label className="field-label">Marks Correct</label><input className="name-field" type="number" value={editTest.mCor} onChange={e=>setEditTest({...editTest,mCor:e.target.value})}/></div>
              <div><label className="field-label">Marks Wrong</label><input className="name-field" type="number" value={editTest.mNeg} onChange={e=>setEditTest({...editTest,mNeg:e.target.value})}/></div>
            </div>
            <label className="field-label">Accent Color</label>
            <div style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap'}}>
              {COLORS.map(c=><div key={c} onClick={()=>setEditTest({...editTest,accentColor:c})} style={{width:26,height:26,borderRadius:6,background:c,cursor:'pointer',outline:editTest.accentColor===c?'3px solid #212121':'none',outlineOffset:2}}/>)}
            </div>
            <div style={{display:'flex',gap:8,marginTop:6}}>
              <button className="process-btn" style={{flex:1}} onClick={saveTest}>💾 Save</button>
              <button className="adm-btn" onClick={()=>setEditTest(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const BASE_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f0f2f5;color:#212121;font-family:'Inter',sans-serif;min-height:100vh}
`

const PANEL_CSS = `
.adm-header{background:#1a237e;padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.adm-logo{display:flex;align-items:center;gap:10px}
.adm-mark{width:34px;height:34px;background:#ffeb3b;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:.82rem;color:#1a237e}
.adm-title{font-weight:800;font-size:1.05rem;color:white}
.adm-sub{font-size:.62rem;color:rgba(255,255,255,.55);font-family:'JetBrains Mono',monospace}
.adm-btn{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:white;padding:6px 14px;border-radius:7px;font-size:.76rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;text-decoration:none;display:inline-block}
.adm-btn:hover{background:rgba(255,255,255,.2)}
.adm-btn.danger{background:rgba(248,113,113,.15);border-color:rgba(248,113,113,.35);color:#fca5a5}
.toast{position:fixed;top:68px;left:50%;transform:translateX(-50%);padding:10px 22px;border-radius:10px;font-weight:700;font-size:.84rem;z-index:999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.18)}
.toast.ok{background:#e8f5e9;color:#1b5e20;border:1px solid #a5d6a7}
.toast.err{background:#ffebee;color:#c62828;border:1px solid #ef9a9a}
.adm-layout{display:flex;min-height:calc(100vh - 58px)}
.adm-sidebar{width:200px;background:white;border-right:1px solid #e8e8e8;padding:16px 10px;display:flex;flex-direction:column;gap:4px;flex-shrink:0}
.sidebar-btn{padding:10px 14px;border-radius:8px;font-family:'Inter',sans-serif;font-weight:600;font-size:.82rem;cursor:pointer;border:none;background:transparent;color:#555;text-align:left;transition:all .14s}
.sidebar-btn:hover{background:#f0f2f5;color:#1a237e}
.sidebar-btn.active{background:#e8eaf6;color:#1a237e;font-weight:700}
.adm-main{flex:1;padding:28px;overflow-y:auto}
.content-section{max-width:800px}
.content-title{font-size:1.3rem;font-weight:800;color:#1a237e;margin-bottom:4px}
.content-sub{font-size:.84rem;color:#888;margin-bottom:22px}

/* Format card */
.format-card{background:white;border-radius:12px;padding:18px 20px;margin-bottom:20px;border:1px solid #e8e8e8;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.format-card-title{font-size:.72rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;font-family:'JetBrains Mono',monospace;margin-bottom:12px}
.format-grid{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
.format-file{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f8f9ff;border-radius:8px;border:1px solid #e8eaf6}
.format-icon{font-size:1.4rem}
.format-name{font-family:'JetBrains Mono',monospace;font-size:.78rem;font-weight:700;color:#1a237e;margin-bottom:2px}
.format-desc{font-size:.72rem;color:#888}
.format-subjects{display:flex;gap:6px;flex-wrap:wrap}
.subj-pill{font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px;background:#e8eaf6;color:#1a237e;border:1px solid #c5cae9;font-family:'JetBrains Mono',monospace}

/* Dropzone */
.big-dropzone{background:white;border:2.5px dashed #c5cae9;border-radius:16px;padding:44px 24px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:16px}
.big-dropzone:hover,.big-dropzone.drag{border-color:#1a237e;background:#f0f3ff}
.dz-big-icon{font-size:3rem;margin-bottom:12px}
.dz-big-title{font-size:1.1rem;font-weight:700;color:#1a237e;margin-bottom:6px}
.dz-big-sub{font-size:.8rem;color:#888;margin-bottom:18px}
.dz-browse-btn{display:inline-block;background:#1a237e;color:white;padding:10px 28px;border-radius:8px;font-weight:700;font-size:.84rem;border:none;cursor:pointer;font-family:'Inter',sans-serif}
.dz-browse-btn:hover{background:#283593}
.file-selected{display:flex;align-items:center;gap:14px;padding:4px 0}
.file-icon{font-size:2rem}
.file-info{flex:1;text-align:left}
.file-name{font-weight:700;font-size:.9rem;color:#1a237e;margin-bottom:2px}
.file-size{font-size:.72rem;color:#888;font-family:'JetBrains Mono',monospace}
.file-remove{background:#ffebee;border:1px solid #ef9a9a;color:#c62828;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center}

/* Submit row */
.submit-row{display:flex;gap:12px;align-items:flex-end;margin-bottom:14px;flex-wrap:wrap}
.name-field-wrap{flex:1;min-width:200px}
.field-label{font-size:.68rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.8px;font-family:'JetBrains Mono',monospace;display:block;margin-bottom:5px}
.name-field{width:100%;background:#f8f9ff;border:1.5px solid #e0e0e0;border-radius:8px;padding:10px 13px;color:#212121;font-family:'Inter',sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;margin-bottom:10px}
.name-field:focus{border-color:#1a237e}
.process-btn{background:linear-gradient(135deg,#1a237e,#283593);color:white;border:none;padding:11px 28px;border-radius:9px;font-family:'Inter',sans-serif;font-weight:700;font-size:.88rem;cursor:pointer;display:flex;align-items:center;gap:8px;white-space:nowrap}
.process-btn:hover{opacity:.9}
.process-btn:disabled{opacity:.5;cursor:not-allowed}
.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .8s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}

/* Progress */
.progress-card{background:white;border-radius:10px;padding:16px 18px;border:1px solid #e8e8e8;margin-bottom:14px}
.progress-bar{height:6px;background:#e8eaf6;border-radius:99px;overflow:hidden;margin-bottom:10px}
.progress-fill{height:100%;width:60%;background:linear-gradient(90deg,#1a237e,#3949ab);border-radius:99px;animation:slide 1.2s ease-in-out infinite}
@keyframes slide{0%{width:20%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:20%;margin-left:80%}}
.progress-label{font-size:.78rem;color:#666;font-family:'JetBrains Mono',monospace}

/* Result */
.result-card{display:flex;align-items:flex-start;gap:14px;padding:18px 20px;border-radius:12px;margin-bottom:14px}
.result-card.ok{background:#e8f5e9;border:1px solid #a5d6a7}
.result-card.err{background:#ffebee;border:1px solid #ef9a9a}
.result-icon{font-size:1.8rem;flex-shrink:0}
.result-title{font-weight:700;font-size:.95rem;color:#1b5e20;margin-bottom:6px}
.result-card.err .result-title{color:#c62828}
.result-detail{display:flex;gap:6px;flex-wrap:wrap}
.result-badge{font-size:.72rem;background:rgba(255,255,255,.7);border:1px solid rgba(0,0,0,.1);padding:3px 10px;border-radius:20px;font-family:'JetBrains Mono',monospace;font-weight:600}
.result-err{font-size:.82rem;color:#c62828}

/* Tests list */
.folder-header{font-size:.72rem;font-weight:800;color:#1a237e;text-transform:uppercase;letter-spacing:1.5px;font-family:'JetBrains Mono',monospace;margin-bottom:10px}
.tests-list{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}
.test-item{background:white;border:1px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.test-item-bar{width:5px;align-self:stretch;flex-shrink:0}
.test-item-body{flex:1;padding:12px 16px;min-width:0}
.test-item-title{font-weight:700;font-size:.9rem;color:#212121;margin-bottom:3px}
.test-item-meta{font-size:.65rem;color:#999;font-family:'JetBrains Mono',monospace;display:flex;gap:4px;flex-wrap:wrap}
.edit-btn{padding:8px 14px;margin:10px;border-radius:7px;background:#f0f2f5;border:1px solid #e0e0e0;color:#555;font-size:.76rem;cursor:pointer;font-family:'Inter',sans-serif;font-weight:600;flex-shrink:0}
.edit-btn:hover{border-color:#1a237e;color:#1a237e}
.loading-txt{color:#888;font-size:.84rem;padding:20px 0}
.empty-txt{color:#bbb;font-size:.84rem;padding:40px 0;text-align:center}

/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px}
.modal-box{background:white;border-radius:16px;padding:26px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.modal-title{font-size:1.1rem;font-weight:800;color:#1a237e;margin-bottom:16px}
`
