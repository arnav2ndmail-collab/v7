import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

const SUBJ_ORDER = ['Physics','Chemistry','Maths','English & LR','Bonus']
const SC = {
  'Physics':      { bg:'#1565c0', grd:'linear-gradient(135deg,#1565c0,#1e88e5)', light:'#e3f2fd', dot:'#42a5f5', label:'PHY', emoji:'⚡', dark:'#0d47a1' },
  'Chemistry':    { bg:'#2e7d32', grd:'linear-gradient(135deg,#2e7d32,#43a047)', light:'#e8f5e9', dot:'#66bb6a', label:'CHEM', emoji:'🧪', dark:'#1b5e20' },
  'Maths':        { bg:'#c62828', grd:'linear-gradient(135deg,#c62828,#e53935)', light:'#ffebee', dot:'#ef5350', label:'MATH', emoji:'📐', dark:'#b71c1c' },
  'English & LR': { bg:'#6a1b9a', grd:'linear-gradient(135deg,#6a1b9a,#8e24aa)', light:'#f3e5f5', dot:'#ab47bc', label:'ENG',  emoji:'📖', dark:'#4a148c' },
  'Bonus':        { bg:'#e65100', grd:'linear-gradient(135deg,#e65100,#f57c00)', light:'#fff3e0', dot:'#ffa726', label:'BON',  emoji:'🎁', dark:'#bf360c' },
}
const getSC = s => SC[s] || { bg:'#37474f', grd:'linear-gradient(135deg,#37474f,#546e7a)', light:'#eceff1', dot:'#78909c', label:'Q', emoji:'📝', dark:'#263238' }
const RES = {
  correct:     { color:'#2e7d32', bg:'#e8f5e9', border:'#a5d6a7', label:'✓ Correct',   icon:'✓' },
  wrong:       { color:'#c62828', bg:'#ffebee', border:'#ef9a9a', label:'✗ Wrong',     icon:'✗' },
  skipped:     { color:'#e65100', bg:'#fff3e0', border:'#ffcc80', label:'↩ Skipped',   icon:'↩' },
  unattempted: { color:'#546e7a', bg:'#eceff1', border:'#b0bec5', label:'— Not Att.', icon:'—' },
}
const DOT_BG = { correct:'#2e7d32', wrong:'#c62828', skipped:'#e65100', unattempted:'#90a4ae' }

const BM_KEY = 'tz_bookmarks_v1'
function loadBooks() { try { return JSON.parse(localStorage.getItem(BM_KEY)||'{}') } catch(e) { return {} } }
function saveBooks(b) { try { localStorage.setItem(BM_KEY, JSON.stringify(b)) } catch(e) {} }

function pct(a,b) { return b ? Math.round(a/b*100) : 0 }
function fmtTime(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs/60), s = secs%60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) } catch(e){return iso}
}

export default function Analyser() {
  const [data, setData]         = useState(null)
  const [err, setErr]           = useState('')
  const [drag, setDrag]         = useState(false)
  const [tab, setTab]           = useState('overview')
  const [activeSubj, setActiveSubj] = useState(null)
  const [filter, setFilter]     = useState('all')
  const [curQ, setCurQ]         = useState(0)
  const fileRef = useRef()
  // Bookmark
  const [books, setBooks]       = useState({})
  const [bmModal, setBmModal]   = useState(false)
  const [bmQ, setBmQ]           = useState(null)
  const [bmTarget, setBmTarget] = useState('')
  const [bmNewName, setBmNewName] = useState('')
  const [bmCreating, setBmCreating] = useState(false)
  const [bmDone, setBmDone]     = useState(false)

  useEffect(() => { setBooks(loadBooks()) }, [])

  const openBmModal = q => { setBmQ(q); setBmModal(true); setBmTarget(''); setBmNewName(''); setBmCreating(false); setBmDone(false) }
  const doBookmark = () => {
    const nb = bmCreating ? bmNewName.trim() : bmTarget
    if (!nb) return
    const b = loadBooks(); if (!b[nb]) b[nb] = []
    const already = b[nb].some(x => x.qnum===bmQ.qnum && x.testTitle===data.testTitle)
    if (!already) {
      b[nb].push({
        qnum:bmQ.qnum, subject:bmQ.subject, type:bmQ.type,
        text:bmQ.text||'', opts:bmQ.opts||[],
        correctAnswer:(bmQ.correctAnswer||bmQ.ans||'').toString().toUpperCase(),
        hasImage:!!(bmQ.images?.length||bmQ.hasImage),
        testTitle:data.testTitle,
        testPath:new URLSearchParams(window.location.search).get('tp')?decodeURIComponent(new URLSearchParams(window.location.search).get('tp')):'',
        savedAt:Date.now()
      })
    }
    saveBooks(b); setBooks(b); setBmDone(true)
    setTimeout(()=>setBmModal(false), 800)
  }

  const processData = d => {
    if (!Array.isArray(d.questions)) throw new Error('No questions array found')
    d.questions = d.questions.map(q=>({
      ...q,
      result: q.result||(!q.yourAnswer?'unattempted':q.yourAnswer==='skip'?'skipped':
        String(q.correctAnswer||'').toUpperCase().trim()===String(q.yourAnswer||'').toUpperCase().trim()?'correct':'wrong')
    }))
    const first = SUBJ_ORDER.filter(s=>s!=='Bonus').find(s=>d.questions.some(q=>q.subject===s))||d.questions[0]?.subject
    setData(d); setActiveSubj(first); setCurQ(0); setFilter('all'); setTab('overview')
  }

  useEffect(()=>{
    if(typeof window==='undefined') return
    const params=new URLSearchParams(window.location.search)
    if(params.get('src')!=='auto') return
    const run=async()=>{
      try{
        const stored=sessionStorage.getItem('tz_analyse')
        if(!stored||stored==='null'){setErr('❌ No test data found. Please upload a result file.');return}
        const meta=JSON.parse(stored)
        const tp=params.get('tp')?decodeURIComponent(params.get('tp')):''
        let questions
        if(tp&&!tp.startsWith('json_')){
          const r=await fetch(`/api/test/${tp}`)
          if(!r.ok) throw new Error(`Test not found (${r.status})`)
          const d=await r.json()
          questions=d.questions.map((q,i)=>{
            const st=meta.answers?.[i]
            const yourAns=st?.yourAnswer??null
            const correct=(q.ans||'').toUpperCase().trim()
            const yours=(yourAns||'').toUpperCase().trim()
            return{...q,yourAnswer:yourAns,correctAnswer:q.ans,
              result:!yourAns?'unattempted':yourAns==='skip'?'skipped':correct===yours?'correct':'wrong'}
          })
        } else {
          questions=meta.answers?.map((a,i)=>({
            qnum:i+1,subject:'Other',type:'MCQ',
            yourAnswer:a.yourAnswer,correctAnswer:a.correctAnswer,result:a.result
          }))||[]
        }
        processData({testTitle:meta.testTitle,subject:meta.subject,date:meta.date,
          score:meta.score,maxScore:meta.maxScore,accuracy:meta.accuracy,
          correct:meta.correct,wrong:meta.wrong,skipped:meta.skipped,unattempted:meta.unattempted,
          duration:meta.duration,marksCorrect:meta.marksCorrect,marksWrong:meta.marksWrong,
          subjStats:meta.subjStats,questions})
      }catch(e){setErr('❌ Could not load: '+e.message)}
    }; run()
  },[])

  const loadFile=async file=>{
    setErr('');setData(null)
    try{const d=JSON.parse(await file.text());processData(d)}catch(e){setErr('❌ '+e.message)}
  }
  const handleDrop=e=>{e.preventDefault();setDrag(false);loadFile(e.dataTransfer.files[0])}

  // ── Upload screen ──────────────────────────────────────────────────────
  if(!data) return(
    <>
      <Head><title>TestZyro — Analyser</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{UPLOAD_CSS}</style>
      <div className="upload-page">
        <a href="/" className="up-back">← Back to TestZyro</a>
        <div className="up-card">
          <div className="up-icon-wrap"><span className="up-icon">📊</span></div>
          <h1 className="up-title">Test Analyser</h1>
          <p className="up-sub">Detailed analysis of your BITSAT performance</p>
          <div className={`up-drop${drag?' dragging':''}`}
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={handleDrop}
            onClick={()=>fileRef.current.click()}>
            <div className="up-drop-icon">📥</div>
            <div className="up-drop-title">Drop your result file here</div>
            <div className="up-drop-sub">or click to browse · JSON output file</div>
            <button className="up-browse-btn" onClick={e=>{e.stopPropagation();fileRef.current.click()}}>Browse File</button>
            <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={e=>{if(e.target.files[0])loadFile(e.target.files[0])}}/>
          </div>
          {err&&<div className="up-err">{err}</div>}
          <div className="up-how">
            <div className="up-how-step"><div className="up-step-n">1</div><span>Give a test on TestZyro</span></div>
            <div className="up-how-arr">→</div>
            <div className="up-how-step"><div className="up-step-n">2</div><span>Click <b>📥 Download Output</b></span></div>
            <div className="up-how-arr">→</div>
            <div className="up-how-step"><div className="up-step-n">3</div><span>Upload it here ✅</span></div>
          </div>
        </div>
      </div>
    </>
  )

  // ── Computed stats ─────────────────────────────────────────────────────
  const allQs    = data.questions
  const subjects = SUBJ_ORDER.filter(s=>allQs.some(q=>q.subject===s))
  const getSubjQs = s => allQs.filter(q=>q.subject===s)
  const ms = qs=>({ total:qs.length, cor:qs.filter(q=>q.result==='correct').length, wrg:qs.filter(q=>q.result==='wrong').length, skp:qs.filter(q=>q.result==='skipped').length, un:qs.filter(q=>q.result==='unattempted').length })
  const overall  = ms(allQs)
  const mCor     = data.marksCorrect||3, mNeg = data.marksWrong||1
  const accuracy = pct(overall.cor, overall.cor+overall.wrg)
  const attempted= overall.cor+overall.wrg+overall.skp
  const score    = data.score ?? (overall.cor*mCor - overall.wrg*mNeg)
  const maxScore = data.maxScore ?? (overall.total*mCor)
  const scoreColor = score >= 0 ? '#2e7d32' : '#c62828'

  // Review tab
  const subjQs    = activeSubj ? allQs.filter(q=>q.subject===activeSubj) : allQs
  const filteredQs= filter==='all' ? subjQs : subjQs.filter(q=>q.result===filter)
  const curQ2     = filteredQs[curQ]||null
  const switchSubj= s=>{setActiveSubj(s);setCurQ(0);setFilter('all')}
  const openReview= s=>{switchSubj(s);setTab('review')}

  const getRating = p => p>=90?'Outstanding 🏆':p>=75?'Excellent 🌟':p>=60?'Good 👍':p>=45?'Average 📚':p>=30?'Below Avg ⚠️':'Needs Work 💪'
  const getRatingColor = p => p>=75?'#2e7d32':p>=45?'#e65100':'#c62828'

  return(
    <>
      <Head><title>Analyser — {data.testTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{APP_CSS}</style>

      {/* ── Header ── */}
      <header className="hdr">
        <a href="/" className="hdr-logo">🎯 <b>Test</b>Zyro</a>
        <div className="hdr-tabs">
          {['overview','review'].map(t=>(
            <button key={t} className={`hdr-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>
              {t==='overview'?'📋 Overview':'📖 Review'}
            </button>
          ))}
        </div>
        <div className="hdr-right">
          <a href="/bookmarks" className="hdr-link">🔖 Bookmarks</a>
          <button className="hdr-new" onClick={()=>setData(null)}>↩ New File</button>
        </div>
      </header>

      {/* ── Bookmark Modal ── */}
      {bmModal&&(
        <div className="bm-overlay" onClick={e=>{if(e.target.className==='bm-overlay')setBmModal(false)}}>
          <div className="bm-modal">
            {bmDone?<div className="bm-done">✅ Bookmarked!</div>:(
              <>
                <div className="bm-modal-ttl">🔖 Save to Notebook</div>
                {Object.keys(books).length>0&&!bmCreating&&(
                  <div className="bm-nb-list">
                    {Object.keys(books).map(nb=>(
                      <div key={nb} className={`bm-nb-item${bmTarget===nb?' sel':''}`} onClick={()=>setBmTarget(nb)}>
                        <span>{nb}</span><span className="bm-cnt">{books[nb].length} qs</span>
                      </div>
                    ))}
                  </div>
                )}
                {!bmCreating?(
                  <button className="bm-create" onClick={()=>setBmCreating(true)}>+ New notebook</button>
                ):(
                  <input className="bm-inp" autoFocus placeholder="Notebook name…"
                    value={bmNewName} onChange={e=>setBmNewName(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&doBookmark()}/>
                )}
                <div className="bm-actions">
                  <button className="bm-save" onClick={doBookmark} disabled={bmCreating?!bmNewName.trim():!bmTarget}>Bookmark</button>
                  <button className="bm-cancel" onClick={()=>setBmModal(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════ OVERVIEW ══════════ */}
      {tab==='overview'&&(
        <div className="page fade">

          {/* ── Hero Score Card ── */}
          <div className="hero-card">
            <div className="hero-left">
              <div className="hero-test-name">{data.testTitle}</div>
              {data.date&&<div className="hero-date">{fmtDate(data.date)}</div>}
              <div className="hero-score-wrap">
                <div className="hero-score" style={{color:scoreColor}}>{score}</div>
                <div className="hero-max">/ {maxScore}</div>
              </div>
              <div className="hero-rating" style={{color:getRatingColor(accuracy)}}>{getRating(accuracy)}</div>
              <div className="hero-chips">
                <span className="hero-chip">⏱ {fmtTime(data.duration)}</span>
                <span className="hero-chip">🎯 {accuracy}% accuracy</span>
                <span className="hero-chip">📝 {attempted}/{overall.total} attempted</span>
              </div>
            </div>
            <div className="hero-right">
              {/* Big donut-style stat blocks */}
              {[
                {n:overall.cor,  l:'Correct',      c:'#2e7d32', bg:'#e8f5e9', ic:'✓'},
                {n:overall.wrg,  l:'Wrong',        c:'#c62828', bg:'#ffebee', ic:'✗'},
                {n:overall.skp,  l:'Skipped',      c:'#e65100', bg:'#fff3e0', ic:'↩'},
                {n:overall.un,   l:'Not Attempted', c:'#546e7a', bg:'#eceff1', ic:'—'},
              ].map(({n,l,c,bg,ic})=>(
                <div key={l} className="hero-stat" style={{background:bg}}>
                  <div className="hero-stat-ic" style={{color:c}}>{ic}</div>
                  <div className="hero-stat-n" style={{color:c}}>{n}</div>
                  <div className="hero-stat-l">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Subject Performance Cards ── */}
          <div className="sec-title">⚡ Subject Performance</div>
          <div className="subj-grid">
            {subjects.map(s=>{
              const sc=getSC(s), st=ms(getSubjQs(s))
              const sp=pct(st.cor,st.cor+st.wrg)
              const subScore=st.cor*mCor-st.wrg*mNeg
              return(
                <div key={s} className="scard" onClick={()=>openReview(s)}>
                  <div className="scard-top" style={{background:sc.grd}}>
                    <div className="scard-emoji">{sc.emoji}</div>
                    <div>
                      <div className="scard-badge">{sc.label}</div>
                      <div className="scard-name">{s}</div>
                    </div>
                    <div className="scard-score-big" style={{color:'rgba(255,255,255,.9)'}}>{subScore>=0?'+':''}{subScore}</div>
                  </div>
                  <div className="scard-body">
                    {/* Accuracy bar */}
                    <div className="scard-bar-label">
                      <span>Accuracy</span><span style={{fontWeight:700,color:sc.bg}}>{sp}%</span>
                    </div>
                    <div className="scard-bar-track">
                      <div className="scard-bar-fill" style={{width:sp+'%',background:sc.grd}}/>
                    </div>
                    {/* 4 stats */}
                    <div className="scard-stats">
                      <div className="scard-stat"><span className="ss-n" style={{color:'#2e7d32'}}>{st.cor}</span><span className="ss-l">✓ Correct</span></div>
                      <div className="scard-stat"><span className="ss-n" style={{color:'#c62828'}}>{st.wrg}</span><span className="ss-l">✗ Wrong</span></div>
                      <div className="scard-stat"><span className="ss-n" style={{color:'#e65100'}}>{st.skp}</span><span className="ss-l">↩ Skip</span></div>
                      <div className="scard-stat"><span className="ss-n" style={{color:'#90a4ae'}}>{st.un}</span><span className="ss-l">— NA</span></div>
                    </div>
                    <button className="scard-btn">Review Questions →</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Detailed Breakdown Table ── */}
          <div className="sec-title">📊 Detailed Breakdown</div>
          <div className="table-wrap">
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>Skipped</th>
                  <th>Not Att.</th>
                  <th>Attempted</th>
                  <th>Accuracy</th>
                  <th>Time/Q</th>
                </tr>
              </thead>
              <tbody>
                {/* Subject rows */}
                {subjects.map(s=>{
                  const sc=getSC(s), st=ms(getSubjQs(s))
                  const sp=pct(st.cor,st.cor+st.wrg)
                  const subScore=st.cor*mCor-st.wrg*mNeg
                  const att=st.cor+st.wrg+st.skp
                  return(
                    <tr key={s} className="tbody-row" onClick={()=>openReview(s)} style={{cursor:'pointer'}}>
                      <td>
                        <div className="td-subj">
                          <div className="td-dot" style={{background:sc.bg}}/>
                          <span className="td-badge" style={{background:sc.light,color:sc.bg}}>{sc.emoji} {sc.label}</span>
                          <span className="td-name">{s}</span>
                        </div>
                      </td>
                      <td><span className="td-score" style={{color:subScore>=0?'#2e7d32':'#c62828'}}>{subScore>=0?'+':''}{subScore}</span></td>
                      <td><span className="td-cor">{st.cor}</span></td>
                      <td><span className="td-wrg">{st.wrg}</span></td>
                      <td><span className="td-skp">{st.skp}</span></td>
                      <td><span className="td-un">{st.un}</span></td>
                      <td><span className="td-att">{att}<span className="td-den">/{st.total}</span></span></td>
                      <td>
                        <div className="td-acc-wrap">
                          <div className="td-acc-bar"><div style={{width:sp+'%',height:'100%',background:sc.grd,borderRadius:99}}/></div>
                          <span className="td-acc-pct" style={{color:sc.bg}}>{sp}%</span>
                        </div>
                      </td>
                      <td><span className="td-time">{data.duration&&st.total?fmtTime(Math.round(data.duration/allQs.length)):'-'}</span></td>
                    </tr>
                  )
                })}
                {/* Total row */}
                <tr className="total-row">
                  <td><div className="td-subj"><span style={{fontWeight:800}}>🔢 Total</span></div></td>
                  <td><span className="td-score" style={{color:scoreColor,fontSize:'1rem'}}>{score}</span></td>
                  <td><span className="td-cor" style={{fontWeight:800}}>{overall.cor}</span></td>
                  <td><span className="td-wrg" style={{fontWeight:800}}>{overall.wrg}</span></td>
                  <td><span className="td-skp" style={{fontWeight:800}}>{overall.skp}</span></td>
                  <td><span className="td-un" style={{fontWeight:800}}>{overall.un}</span></td>
                  <td><span className="td-att" style={{fontWeight:800}}>{attempted}<span className="td-den">/{overall.total}</span></span></td>
                  <td>
                    <div className="td-acc-wrap">
                      <div className="td-acc-bar"><div style={{width:accuracy+'%',height:'100%',background:'linear-gradient(90deg,#1565c0,#6a1b9a)',borderRadius:99}}/></div>
                      <span className="td-acc-pct" style={{color:'#1565c0',fontWeight:800}}>{accuracy}%</span>
                    </div>
                  </td>
                  <td><span className="td-time">{fmtTime(data.duration)}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Marking Scheme Info ── */}
          <div className="marking-info">
            <div className="mi-item"><span className="mi-dot" style={{background:'#e8f5e9',border:'1px solid #a5d6a7'}}/>Correct: <b style={{color:'#2e7d32'}}>+{mCor}</b></div>
            <div className="mi-item"><span className="mi-dot" style={{background:'#ffebee',border:'1px solid #ef9a9a'}}/>Wrong: <b style={{color:'#c62828'}}>−{mNeg}</b></div>
            <div className="mi-item"><span className="mi-dot" style={{background:'#eceff1',border:'1px solid #b0bec5'}}/>Skipped/NA: <b style={{color:'#546e7a'}}>0</b></div>
          </div>

        </div>
      )}

      {/* ══════════ REVIEW ══════════ */}
      {tab==='review'&&(
        <div className="review-shell">

          {/* Subject tabs */}
          <div className="rev-subj-bar">
            {subjects.map(s=>{
              const sc=getSC(s), st=ms(getSubjQs(s)), isA=activeSubj===s
              return(
                <button key={s} className={`rsb${isA?' on':''}`}
                  style={isA?{background:sc.grd,color:'white',borderColor:'transparent',boxShadow:`0 4px 14px ${sc.bg}55`}:{color:sc.bg,borderColor:sc.bg+'44'}}
                  onClick={()=>switchSubj(s)}>
                  <span className="rsb-em">{sc.emoji}</span>
                  <span className="rsb-lb">{sc.label}</span>
                  <span className="rsb-name">{s}</span>
                  <span className="rsb-cnt" style={isA?{background:'rgba(255,255,255,.22)'}:{background:sc.light,color:sc.bg}}>
                    {st.cor}/{st.total}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="rev-body">
            {/* Left nav */}
            <div className="rev-nav">
              <div className="rn-hdr">Questions <span className="rn-cnt">{filteredQs.length}/{subjQs.length}</span></div>
              {/* Filter pills */}
              <div className="rn-filters">
                {[['all','All',null],['correct','✓ Correct','#2e7d32'],['wrong','✗ Wrong','#c62828'],['skipped','↩ Skipped','#e65100'],['unattempted','— NA','#546e7a']].map(([m,l,c])=>(
                  <button key={m} className={`rf${filter===m?' on':''}`}
                    style={filter===m&&c?{background:c,color:'white',borderColor:c}:filter===m?{background:'#1a237e',color:'white',borderColor:'#1a237e'}:{}}
                    onClick={()=>{setFilter(m);setCurQ(0)}}>{l}</button>
                ))}
              </div>
              {/* Dot grid */}
              <div className="rn-dots">
                {filteredQs.map((q,i)=>(
                  <div key={i} className={`rn-dot${i===curQ?' cur':''}`}
                    style={{background:i===curQ?'#1a237e':DOT_BG[q.result]||'#90a4ae',
                      boxShadow:i===curQ?'0 0 0 2.5px white,0 0 0 4.5px #1a237e':''}}
                    onClick={()=>setCurQ(i)}>
                    {q.qnum||(subjQs.indexOf(q)+1)}
                  </div>
                ))}
                {!filteredQs.length&&<div style={{color:'#999',fontSize:'.74rem',gridColumn:'1/-1',textAlign:'center',paddingTop:16}}>No questions</div>}
              </div>
              {/* Legend */}
              <div className="rn-legend">
                {Object.entries(DOT_BG).map(([k,c])=>(
                  <div key={k} className="rn-leg"><div className="rn-leg-dot" style={{background:c}}/><span>{RES[k]?.label}</span></div>
                ))}
              </div>
            </div>

            {/* Question panel */}
            <div className="rev-qpanel">
              {!curQ2?(
                <div className="rq-empty">
                  <div style={{fontSize:'2.5rem',marginBottom:12}}>🔍</div>
                  <div>Select a question to review</div>
                </div>
              ):(
                <>
                  {/* Q header */}
                  <div className="rq-hdr">
                    <div className="rq-hl">
                      <span className="rq-num">Q{curQ2.qnum||(subjQs.indexOf(curQ2)+1)}</span>
                      {curQ2.subject&&(()=>{const sc=getSC(curQ2.subject);return(
                        <span className="rq-subj" style={{background:sc.light,color:sc.bg,border:`1px solid ${sc.dot}55`}}>{sc.emoji} {curQ2.subject}</span>
                      )})()}
                      <span className={`rq-type ${curQ2.type==='INTEGER'?'int':'mcq'}`}>{curQ2.type==='INTEGER'?'Integer':'MCQ'}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <button className="rq-bm" onClick={()=>openBmModal(curQ2)} title="Bookmark">🔖</button>
                      <span className="rq-res-badge" style={{background:RES[curQ2.result]?.bg,color:RES[curQ2.result]?.color,border:`1px solid ${RES[curQ2.result]?.border}`}}>
                        {RES[curQ2.result]?.label}
                      </span>
                    </div>
                  </div>

                  {/* Q content */}
                  <div className="rq-content">
                    {curQ2.images?.length>0?(
                      <div className="rq-imgs">{curQ2.images.map((img,i)=><img key={i} src={`data:image/png;base64,${img}`} alt="" style={{maxWidth:'100%',display:'block',margin:'0 auto 8px',borderRadius:8}}/>)}</div>
                    ):(
                      <div className="rq-text" dangerouslySetInnerHTML={{__html:(curQ2.text||'').replace(/\n/g,'<br/>')}}/>
                    )}
                  </div>

                  {/* Options */}
                  {curQ2.type==='MCQ'&&curQ2.opts&&(
                    <div className="rq-opts">
                      {['A','B','C','D'].map((lbl,i)=>{
                        const isCor=lbl===(curQ2.correctAnswer||'').toUpperCase().trim()
                        const isYrs=lbl===(curQ2.yourAnswer||'').toUpperCase().trim()
                        return(
                          <div key={lbl} className={`rq-opt${isCor?' cor':isYrs&&!isCor?' wrg':''}`}>
                            <div className="rq-opt-lbl">{lbl}</div>
                            <div className="rq-opt-text">{curQ2.opts[i]||`Option ${lbl}`}</div>
                            <div className="rq-opt-tags">
                              {isCor&&<span className="rqt green">✓ Correct</span>}
                              {isYrs&&!isCor&&<span className="rqt red">✗ Your Ans</span>}
                              {isCor&&isYrs&&<span className="rqt green">✓ Your Ans</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {curQ2.type==='INTEGER'&&(
                    <div className="rq-int">
                      <div className="rq-int-row"><span className="rq-int-lbl">Your Answer</span><span className="rq-int-val" style={{color:curQ2.result==='correct'?'#2e7d32':'#c62828',background:curQ2.result==='correct'?'#e8f5e9':'#ffebee'}}>{curQ2.yourAnswer||'—'}</span></div>
                      <div className="rq-int-row"><span className="rq-int-lbl">Correct Answer</span><span className="rq-int-val" style={{color:'#2e7d32',background:'#e8f5e9'}}>{curQ2.correctAnswer}</span></div>
                    </div>
                  )}

                  {/* Nav */}
                  <div className="rq-nav">
                    <button className="rqn-btn" disabled={curQ===0} onClick={()=>setCurQ(c=>c-1)}>← Prev</button>
                    <span className="rqn-cnt">{curQ+1} / {filteredQs.length}</span>
                    <button className="rqn-btn primary" disabled={curQ>=filteredQs.length-1} onClick={()=>setCurQ(c=>c+1)}>Next →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const UPLOAD_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f0f4ff;font-family:'Inter',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
.upload-page{width:100%;max-width:600px;margin:0 auto;padding:24px}
.up-back{display:inline-block;color:#546e7a;font-size:.8rem;text-decoration:none;margin-bottom:24px;opacity:.8}
.up-back:hover{opacity:1}
.up-card{background:white;border-radius:20px;padding:44px 40px;box-shadow:0 8px 40px rgba(26,35,126,.1);text-align:center}
.up-icon-wrap{width:80px;height:80px;background:linear-gradient(135deg,#1565c0,#6a1b9a);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(21,101,192,.3)}
.up-icon{font-size:2.2rem}
.up-title{font-size:1.8rem;font-weight:900;color:#1a237e;letter-spacing:-1px;margin-bottom:8px}
.up-sub{font-size:.88rem;color:#888;margin-bottom:28px}
.up-drop{background:#f5f7ff;border:2.5px dashed #c5cae9;border-radius:16px;padding:40px 24px;cursor:pointer;transition:all .22s;margin-bottom:16px}
.up-drop:hover,.up-drop.dragging{border-color:#1565c0;background:#e8eaf6}
.up-drop-icon{font-size:2.4rem;margin-bottom:12px}
.up-drop-title{font-size:.98rem;font-weight:700;color:#1a237e;margin-bottom:6px}
.up-drop-sub{font-size:.78rem;color:#888;margin-bottom:18px}
.up-browse-btn{background:linear-gradient(135deg,#1565c0,#6a1b9a);color:white;border:none;padding:11px 28px;border-radius:9px;font-weight:700;font-size:.84rem;cursor:pointer;box-shadow:0 4px 14px rgba(21,101,192,.3)}
.up-err{background:#ffebee;border:1px solid #ef9a9a;color:#c62828;padding:10px 14px;border-radius:8px;font-size:.82rem;margin-bottom:12px;text-align:left}
.up-how{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:20px}
.up-how-step{display:flex;align-items:center;gap:7px;font-size:.76rem;color:#546e7a}
.up-step-n{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#1565c0,#6a1b9a);color:white;font-size:.64rem;font-weight:800;display:flex;align-items:center;justify-content:center}
.up-how-arr{color:#bbb;font-size:.9rem}
`

const APP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f0f2f8;font-family:'Inter',sans-serif;min-height:100vh;color:#1a1a2e}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f0f0f0}::-webkit-scrollbar-thumb{background:#c5cae9;border-radius:3px}
@keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.fade{animation:fadeIn .35s ease both}

/* Header */
.hdr{background:#1a237e;height:56px;display:flex;align-items:center;padding:0 24px;gap:16px;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(26,35,126,.35)}
.hdr-logo{color:white;text-decoration:none;font-size:1.05rem;font-weight:400;flex-shrink:0}.hdr-logo b{font-weight:900;color:#ffeb3b}
.hdr-tabs{display:flex;gap:4px;flex:1;justify-content:center}
.hdr-tab{padding:7px 20px;border-radius:7px;border:none;background:transparent;color:rgba(255,255,255,.7);font-family:'Inter',sans-serif;font-weight:600;font-size:.82rem;cursor:pointer;transition:all .15s}
.hdr-tab:hover{background:rgba(255,255,255,.1);color:white}
.hdr-tab.on{background:rgba(255,255,255,.18);color:white}
.hdr-right{display:flex;gap:8px;flex-shrink:0;align-items:center}
.hdr-link{color:rgba(255,255,255,.8);font-size:.78rem;text-decoration:none;padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.25);transition:all .15s}
.hdr-link:hover{background:rgba(255,255,255,.1);color:white}
.hdr-new{background:rgba(255,255,255,.12);color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.25);padding:6px 14px;border-radius:6px;font-family:'Inter',sans-serif;font-size:.78rem;cursor:pointer}
.hdr-new:hover{background:rgba(255,255,255,.2)}

/* Page */
.page{max-width:1100px;margin:0 auto;padding:28px 20px 80px}

/* Hero card */
.hero-card{background:white;border-radius:18px;padding:28px 32px;display:flex;gap:32px;align-items:flex-start;margin-bottom:28px;box-shadow:0 4px 24px rgba(26,35,126,.1);border:1px solid #e0e4ff;flex-wrap:wrap}
.hero-left{flex:1;min-width:220px}
.hero-test-name{font-size:1.05rem;font-weight:800;color:#1a237e;margin-bottom:4px;letter-spacing:-.3px}
.hero-date{font-size:.72rem;color:#999;font-family:'JetBrains Mono',monospace;margin-bottom:16px}
.hero-score-wrap{display:flex;align-items:baseline;gap:4px;margin-bottom:4px}
.hero-score{font-family:'JetBrains Mono',monospace;font-size:3.8rem;font-weight:900;letter-spacing:-3px;line-height:1}
.hero-max{font-size:1.2rem;color:#999;font-weight:400}
.hero-rating{font-size:.88rem;font-weight:800;margin-bottom:14px}
.hero-chips{display:flex;gap:8px;flex-wrap:wrap}
.hero-chip{font-size:.72rem;background:#f0f4ff;color:#3949ab;border:1px solid #c5cae9;padding:4px 12px;border-radius:20px;font-weight:600}
.hero-right{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;flex-shrink:0}
.hero-stat{border-radius:14px;padding:18px 16px;text-align:center;min-width:100px}
.hero-stat-ic{font-size:1.1rem;margin-bottom:4px;font-weight:800}
.hero-stat-n{font-family:'JetBrains Mono',monospace;font-size:2rem;font-weight:900;line-height:1;margin-bottom:4px}
.hero-stat-l{font-size:.62rem;color:#666;text-transform:uppercase;letter-spacing:.5px}

/* Section title */
.sec-title{font-size:.65rem;font-weight:800;color:#546e7a;text-transform:uppercase;letter-spacing:3px;margin-bottom:14px;display:flex;align-items:center;gap:10px}
.sec-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#c5cae9,transparent)}

/* Subject cards */
.subj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;margin-bottom:32px}
.scard{background:white;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07);cursor:pointer;transition:all .2s;border:1px solid #e8eaf6}
.scard:hover{transform:translateY(-4px);box-shadow:0 8px 32px rgba(0,0,0,.13)}
.scard-top{padding:18px 18px 14px;display:flex;align-items:center;gap:12px;position:relative}
.scard-emoji{font-size:1.6rem;flex-shrink:0}
.scard-badge{font-size:.6rem;font-weight:800;color:rgba(255,255,255,.85);font-family:'JetBrains Mono',monospace;letter-spacing:.5px;margin-bottom:2px}
.scard-name{font-size:.82rem;font-weight:700;color:rgba(255,255,255,.9)}
.scard-score-big{position:absolute;right:16px;top:50%;transform:translateY(-50%);font-family:'JetBrains Mono',monospace;font-size:1.5rem;font-weight:900}
.scard-body{padding:14px 16px 16px}
.scard-bar-label{display:flex;justify-content:space-between;font-size:.72rem;color:#666;margin-bottom:6px}
.scard-bar-track{height:6px;background:#f0f0f0;border-radius:99px;overflow:hidden;margin-bottom:14px}
.scard-bar-fill{height:100%;border-radius:99px;transition:width .6s}
.scard-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:14px}
.scard-stat{text-align:center}
.ss-n{display:block;font-family:'JetBrains Mono',monospace;font-size:1.05rem;font-weight:800}
.ss-l{font-size:.58rem;color:#888;text-transform:uppercase}
.scard-btn{width:100%;padding:9px;background:#f0f4ff;color:#1565c0;border:1.5px solid #c5cae9;border-radius:8px;font-family:'Inter',sans-serif;font-weight:700;font-size:.76rem;cursor:pointer;transition:all .15s}
.scard-btn:hover{background:#e8eaf6;border-color:#1565c0}

/* Table */
.table-wrap{background:white;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:20px;border:1px solid #e8eaf6;overflow-x:auto}
.breakdown-table{width:100%;border-collapse:collapse;font-size:.82rem}
.breakdown-table thead tr{background:#1a237e}
.breakdown-table th{padding:12px 14px;text-align:left;font-size:.65rem;font-weight:800;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.8px;white-space:nowrap}
.tbody-row{border-bottom:1px solid #f0f0f0;transition:background .12s}
.tbody-row:hover{background:#f5f7ff}
.total-row{background:#f5f7ff;border-top:2px solid #c5cae9}
.total-row td{padding:14px 14px;font-size:.84rem}
.breakdown-table td{padding:12px 14px;vertical-align:middle}
.td-subj{display:flex;align-items:center;gap:8px}
.td-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.td-badge{font-size:.6rem;font-weight:800;padding:2px 7px;border-radius:10px;font-family:'JetBrains Mono',monospace;white-space:nowrap}
.td-name{font-weight:600;font-size:.82rem;color:#1a237e}
.td-score{font-family:'JetBrains Mono',monospace;font-weight:800;font-size:.9rem}
.td-cor{color:#2e7d32;font-weight:700;font-family:'JetBrains Mono',monospace}
.td-wrg{color:#c62828;font-weight:700;font-family:'JetBrains Mono',monospace}
.td-skp{color:#e65100;font-weight:700;font-family:'JetBrains Mono',monospace}
.td-un{color:#546e7a;font-weight:700;font-family:'JetBrains Mono',monospace}
.td-att{font-family:'JetBrains Mono',monospace;font-weight:700;color:#1a237e}
.td-den{color:#bbb;font-weight:400}
.td-acc-wrap{display:flex;align-items:center;gap:8px}
.td-acc-bar{width:60px;height:5px;background:#e8eaf6;border-radius:99px;overflow:hidden;flex-shrink:0}
.td-acc-pct{font-family:'JetBrains Mono',monospace;font-size:.74rem;font-weight:800;white-space:nowrap}
.td-time{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#888}

/* Marking info */
.marking-info{display:flex;gap:16px;flex-wrap:wrap;font-size:.78rem;color:#546e7a;padding:12px 16px;background:white;border-radius:10px;border:1px solid #e8eaf6;margin-bottom:8px}
.mi-item{display:flex;align-items:center;gap:6px}
.mi-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0}

/* Review */
.review-shell{display:flex;flex-direction:column;height:calc(100vh - 56px);overflow:hidden}
.rev-subj-bar{background:#f8f9ff;border-bottom:1px solid #e0e4ff;padding:8px 14px;display:flex;gap:6px;overflow-x:auto;flex-shrink:0}
.rsb{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;border:1.5px solid;background:transparent;cursor:pointer;font-family:'Inter',sans-serif;font-size:.78rem;font-weight:600;white-space:nowrap;transition:all .18s;flex-shrink:0}
.rsb-em{font-size:.9rem}
.rsb-lb{font-family:'JetBrains Mono',monospace;font-size:.62rem;font-weight:800}
.rsb-cnt{font-family:'JetBrains Mono',monospace;font-size:.6rem;font-weight:700;padding:2px 7px;border-radius:20px}
.rev-body{display:flex;flex:1;overflow:hidden;min-height:0}

/* Nav panel */
.rev-nav{width:216px;flex-shrink:0;background:white;border-right:1px solid #e8eaf6;display:flex;flex-direction:column;overflow:hidden}
.rn-hdr{padding:10px 12px;font-family:'JetBrains Mono',monospace;font-size:.6rem;font-weight:800;color:#546e7a;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #e8eaf6;display:flex;justify-content:space-between;align-items:center}
.rn-cnt{color:#1565c0;font-weight:400}
.rn-filters{padding:8px;display:flex;flex-direction:column;gap:3px;border-bottom:1px solid #e8eaf6}
.rf{padding:7px 10px;border-radius:6px;font-size:.74rem;font-weight:600;cursor:pointer;border:1.5px solid #e8eaf6;background:transparent;color:#546e7a;font-family:'Inter',sans-serif;text-align:left;transition:all .12s}
.rf:hover{background:#f5f7ff;border-color:#c5cae9;color:#1a237e}
.rn-dots{padding:10px;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;overflow-y:auto;flex:1}
.rn-dot{height:28px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:.56rem;font-weight:800;cursor:pointer;color:white;transition:all .1s}
.rn-dot:hover{transform:scale(1.1)}
.rn-dot.cur{border-radius:6px}
.rn-legend{padding:8px 10px;border-top:1px solid #e8eaf6}
.rn-leg{display:flex;align-items:center;gap:5px;font-size:.62rem;color:#888;margin-bottom:4px}
.rn-leg-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}

/* Question panel — WHITE bg */
.rev-qpanel{flex:1;background:white;overflow-y:auto;padding:22px 26px;display:flex;flex-direction:column;gap:14px}
.rq-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#999;text-align:center;font-size:.86rem}
.rq-hdr{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.rq-hl{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rq-num{font-family:'JetBrains Mono',monospace;font-size:.8rem;font-weight:700;background:#e8eaf6;border:1.5px solid #c5cae9;color:#1a237e;padding:4px 12px;border-radius:7px}
.rq-subj{font-size:.7rem;font-weight:700;padding:4px 10px;border-radius:20px;font-family:'JetBrains Mono',monospace}
.rq-type{font-size:.62rem;font-weight:800;padding:3px 8px;border-radius:20px;font-family:'JetBrains Mono',monospace}
.rq-type.mcq{background:#e3f2fd;color:#1565c0;border:1px solid #90caf9}
.rq-type.int{background:#fff8e1;color:#e65100;border:1px solid #ffe082}
.rq-bm{background:#fff8e1;border:1px solid #ffe082;color:#f59e0b;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.9rem}
.rq-bm:hover{background:#fef3c7;transform:scale(1.08)}
.rq-res-badge{font-size:.76rem;font-weight:700;padding:5px 13px;border-radius:20px}
.rq-content{background:#fafbff;border:1px solid #e8eaf6;border-radius:12px;padding:16px;min-height:70px}
.rq-imgs{text-align:center}
.rq-text{font-size:.92rem;line-height:1.9;color:#1a1a2e;white-space:pre-wrap;font-family:'Inter',sans-serif}
.rq-opts{display:flex;flex-direction:column;gap:8px}
.rq-opt{display:flex;align-items:flex-start;gap:10px;border:1.5px solid #e8eaf6;border-radius:10px;padding:11px 14px;background:white;transition:all .12s}
.rq-opt.cor{border-color:#2e7d32!important;background:#e8f5e9!important}
.rq-opt.wrg{border-color:#c62828!important;background:#ffebee!important}
.rq-opt-lbl{width:28px;height:28px;border-radius:7px;background:#e8eaf6;border:1.5px solid #c5cae9;color:#1a237e;font-family:'JetBrains Mono',monospace;font-size:.72rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rq-opt.cor .rq-opt-lbl{background:#2e7d32;border-color:#2e7d32;color:white}
.rq-opt.wrg .rq-opt-lbl{background:#c62828;border-color:#c62828;color:white}
.rq-opt-text{flex:1;font-size:.88rem;color:#1a1a2e;line-height:1.65;padding-top:2px}
.rq-opt-tags{display:flex;flex-direction:column;gap:3px;align-items:flex-end;padding-top:2px;flex-shrink:0}
.rqt{font-size:.6rem;font-weight:800;padding:2px 7px;border-radius:8px;white-space:nowrap}
.rqt.green{background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7}
.rqt.red{background:#ffebee;color:#c62828;border:1px solid #ef9a9a}
.rq-int{background:#fafbff;border-radius:10px;overflow:hidden;border:1px solid #e8eaf6}
.rq-int-row{display:flex;align-items:center;padding:13px 16px;border-bottom:1px solid #eee}
.rq-int-row:last-child{border-bottom:none}
.rq-int-lbl{font-size:.78rem;color:#666;flex:1}
.rq-int-val{font-family:'JetBrains Mono',monospace;font-size:1.1rem;font-weight:800;padding:5px 16px;border-radius:7px}
.rq-nav{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f0f0f0;padding-top:12px;margin-top:auto}
.rqn-btn{padding:9px 22px;border-radius:8px;border:1.5px solid #c5cae9;background:white;color:#1a237e;font-family:'Inter',sans-serif;font-weight:700;font-size:.8rem;cursor:pointer;transition:all .15s}
.rqn-btn:hover:not(:disabled){background:#e8eaf6;border-color:#1a237e}
.rqn-btn.primary{background:#1a237e;color:white;border-color:#1a237e;box-shadow:0 4px 14px rgba(26,35,126,.25)}
.rqn-btn.primary:hover:not(:disabled){background:#283593}
.rqn-btn:disabled{opacity:.3;cursor:not-allowed}
.rqn-cnt{font-family:'JetBrains Mono',monospace;font-size:.84rem;color:#546e7a;font-weight:700}

/* Bookmark modal */
.bm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)}
.bm-modal{background:white;border-radius:16px;padding:24px;width:100%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.bm-done{text-align:center;font-size:1.1rem;font-weight:700;color:#2e7d32;padding:8px 0}
.bm-modal-ttl{font-weight:800;font-size:.95rem;color:#1a237e;margin-bottom:14px}
.bm-nb-list{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;max-height:180px;overflow-y:auto}
.bm-nb-item{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border:1.5px solid #e8eaf6;border-radius:8px;cursor:pointer;transition:all .12s;font-size:.84rem}
.bm-nb-item:hover{border-color:#1a237e;background:#f5f7ff}
.bm-nb-item.sel{border-color:#1a237e;background:#e8eaf6;font-weight:600}
.bm-cnt{font-size:.65rem;color:#888;font-family:'JetBrains Mono',monospace}
.bm-create{background:none;border:1.5px dashed #c5cae9;color:#1a237e;padding:8px;border-radius:8px;width:100%;font-size:.8rem;font-weight:600;cursor:pointer;margin-bottom:12px;font-family:'Inter',sans-serif}
.bm-create:hover{background:#f5f7ff}
.bm-inp{width:100%;border:1.5px solid #c5cae9;border-radius:8px;padding:9px 12px;font-size:.84rem;outline:none;font-family:'Inter',sans-serif;margin-bottom:12px}
.bm-inp:focus{border-color:#1a237e}
.bm-actions{display:flex;gap:8px}
.bm-save{flex:1;background:#1a237e;color:white;border:none;padding:10px;border-radius:8px;font-weight:700;font-size:.84rem;cursor:pointer}
.bm-save:disabled{background:#9e9e9e;cursor:not-allowed}
.bm-cancel{padding:10px 16px;border-radius:8px;border:1px solid #e0e0e0;background:white;font-size:.84rem;cursor:pointer}

@media(max-width:768px){
  .hero-card{flex-direction:column}
  .hero-right{width:100%;grid-template-columns:repeat(4,1fr)}
  .rev-body{flex-direction:column}
  .rev-nav{width:100%;max-height:200px;border-right:none;border-bottom:1px solid #e8eaf6}
  .rn-dots{grid-template-columns:repeat(8,1fr)}
  .subj-grid{grid-template-columns:1fr}
}
`
