import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

const SUBJ_ORDER = ['Physics','Chemistry','Maths','English & LR']
const SUBJ_COLORS = {
  'Physics':      { accent:'#1565c0', light:'#e3f2fd', border:'#90caf9', label:'PHY' },
  'Chemistry':    { accent:'#2e7d32', light:'#e8f5e9', border:'#a5d6a7', label:'CHEM' },
  'Maths':        { accent:'#c62828', light:'#ffebee', border:'#ef9a9a', label:'MATH' },
  'English & LR': { accent:'#6a1b9a', light:'#f3e5f5', border:'#ce93d8', label:'ENG' },
}
const SC = s => SUBJ_COLORS[s] || { accent:'#455a64', light:'#eceff1', border:'#b0bec5', label:'Q' }

const RES = {
  correct:     { color:'#2e7d32', bg:'#e8f5e9', border:'#a5d6a7', label:'✓ Correct',       dot:'#2e7d32' },
  wrong:       { color:'#c62828', bg:'#ffebee', border:'#ef9a9a', label:'✗ Wrong',          dot:'#c62828' },
  skipped:     { color:'#e65100', bg:'#fff3e0', border:'#ffcc80', label:'↩ Skipped',        dot:'#e65100' },
  unattempted: { color:'#757575', bg:'#f5f5f5', border:'#e0e0e0', label:'— Not Attempted',  dot:'#bdbdbd' },
}

export default function Analyser() {
  const [data, setData]       = useState(null)
  const [err,  setErr]        = useState('')
  const [drag, setDrag]       = useState(false)
  const [tab,  setTab]        = useState('overview')   // overview | review
  const [activeSubj, setActiveSubj] = useState(null)
  const [filter, setFilter]   = useState('all')
  const [curQ,  setCurQ]      = useState(0)
  const fileRef = useRef()

  const loadFile = async file => {
    setErr(''); setData(null)
    try {
      const text = await file.text()
      const d = JSON.parse(text)
      if (!Array.isArray(d.questions)) throw new Error('No questions found in this file')
      d.questions = d.questions.map((q,i) => ({
        ...q,
        result: q.result || (
          !q.yourAnswer ? 'unattempted' :
          q.yourAnswer === 'skip' ? 'skipped' :
          (String(q.correctAnswer||'').toUpperCase().trim() === String(q.yourAnswer||'').toUpperCase().trim())
            ? 'correct' : 'wrong'
        )
      }))
      const firstSubj = SUBJ_ORDER.find(s => d.questions.some(q => q.subject === s)) || d.questions[0]?.subject || null
      setData(d)
      setActiveSubj(firstSubj)
      setCurQ(0); setFilter('all'); setTab('overview')
    } catch(e) { setErr('❌ ' + e.message) }
  }

  const handleDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if(f) loadFile(f) }

  // ── Upload screen ─────────────────────────────────────────────────────────
  if (!data) return (
    <>
      <Head><title>TestZyro — Analyser</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`${BASE_CSS}${UPLOAD_CSS}`}</style>
      <div className="upload-page">
        <div className="upload-hero">
          <div className="upload-logo">📊</div>
          <h1>Test Analyser</h1>
          <p>Upload your result file to get detailed subject-wise analysis</p>
          <div className={`dropzone${drag?' drag':''}`}
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={handleDrop}
            onClick={()=>fileRef.current.click()}>
            <div className="dz-icon">📥</div>
            <div className="dz-title">Drop result .json here</div>
            <div className="dz-sub">Downloaded after submitting a test</div>
            <div className="dz-btn">Browse File</div>
            <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={e=>{if(e.target.files[0])loadFile(e.target.files[0])}}/>
          </div>
          {err && <div className="upload-err">{err}</div>}
          <div className="upload-hint">
            <b>How?</b> Complete a test → click <b>📥 Download Output File</b> → upload it here
          </div>
        </div>
      </div>
    </>
  )

  // ── Computed data ─────────────────────────────────────────────────────────
  const allQs    = data.questions
  const subjects = SUBJ_ORDER.filter(s => allQs.some(q => q.subject === s))
  if (!subjects.length) subjects.push(allQs[0]?.subject || 'All')

  const getSubjQs = s => s ? allQs.filter(q => q.subject === s) : allQs
  const subjQs    = getSubjQs(activeSubj)
  const filteredQs = filter === 'all' ? subjQs : subjQs.filter(q => q.result === filter)
  const curQuestion = filteredQs[curQ] || null

  const makeStats = qs => ({
    total:       qs.length,
    correct:     qs.filter(q => q.result==='correct').length,
    wrong:       qs.filter(q => q.result==='wrong').length,
    skipped:     qs.filter(q => q.result==='skipped').length,
    unattempted: qs.filter(q => q.result==='unattempted').length,
  })
  const overallStats = makeStats(allQs)
  const mCor = data.marksCorrect || 3
  const mNeg = data.marksWrong  || 1

  const switchSubj = s => { setActiveSubj(s); setCurQ(0); setFilter('all') }
  const switchFilter = f => { setFilter(f); setCurQ(0) }

  const openReview = (subj, f='all', idx=0) => {
    setActiveSubj(subj); setFilter(f); setCurQ(idx); setTab('review')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>Analyser — {data.testTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`${BASE_CSS}${APP_CSS}`}</style>

      {/* ── Top nav ── */}
      <header className="topnav">
        <a href="/" className="tz-logo"><span className="tz-mark">TZ</span><span className="tz-name">TestZyro</span></a>
        <div className="nav-tabs">
          <button className={`nav-tab${tab==='overview'?' active':''}`} onClick={()=>setTab('overview')}>📋 Overview</button>
          <button className={`nav-tab${tab==='review'?' active':''}`} onClick={()=>setTab('review')}>📖 Review Questions</button>
        </div>
        <div className="nav-right">
          <div className="test-name-chip">{data.testTitle}</div>
          <button className="btn-new" onClick={()=>setData(null)}>↩ New File</button>
        </div>
      </header>

      {/* ════ OVERVIEW TAB ════ */}
      {tab === 'overview' && (
        <div className="page anim">

          {/* Score hero */}
          <div className="score-hero">
            <div className="score-hero-left">
              <div className="score-hero-label">Overall Score</div>
              <div className="score-hero-num" style={{color:data.score>=0?'#4ade80':'#f87171'}}>
                {data.score}<span className="score-hero-max">/{data.maxScore}</span>
              </div>
              <div className="score-hero-sub">
                {data.subject} &nbsp;·&nbsp;
                {new Date(data.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} &nbsp;·&nbsp;
                {Math.floor((data.duration||0)/60)}m {(data.duration||0)%60}s
              </div>
            </div>
            <div className="score-hero-cards">
              {[
                ['✓ Correct',    data.correct||0,    '#4ade80','rgba(74,222,128,.15)'],
                ['✗ Wrong',      data.wrong||0,      '#f87171','rgba(248,113,113,.15)'],
                ['↩ Skipped',    data.skipped||0,    '#fb923c','rgba(251,146,60,.15)'],
                ['— Not Att.',   data.unattempted||0,'#94a3b8','rgba(148,163,184,.12)'],
                ['🎯 Accuracy',  (data.accuracy||0)+'%','#38bdf8','rgba(56,189,248,.15)'],
              ].map(([l,v,c,bg])=>(
                <div key={l} className="hero-card" style={{background:bg,borderColor:c+'44'}}>
                  <div className="hero-card-val" style={{color:c}}>{v}</div>
                  <div className="hero-card-lbl">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject breakdown */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">📊 Performance Breakdown</h2>
            </div>
            <div className="breakdown-table">
              <div className="bt-head">
                <div>Subject</div>
                <div>Score</div>
                <div>Correct</div>
                <div>Wrong</div>
                <div>Not Att.</div>
                <div>Accuracy</div>
              </div>
              {/* Overall */}
              {(()=>{
                const s = overallStats
                const score = s.correct*mCor - s.wrong*mNeg
                const pct = (s.correct+s.wrong) ? Math.round(s.correct/(s.correct+s.wrong)*100) : 0
                return (
                  <div className="bt-row bt-overall">
                    <div className="bt-subj-cell"><span className="bt-subj-name">🔢 Overall</span></div>
                    <div><span className="bt-big" style={{color:score>=0?'#2e7d32':'#c62828'}}>{score>=0?'+':''}{score}</span><span className="bt-den">/{data.maxScore}</span></div>
                    <div><span className="bt-big green">{s.correct}</span><span className="bt-den">/{s.total}</span></div>
                    <div><span className="bt-big red">{s.wrong}</span><span className="bt-den">/{s.total}</span></div>
                    <div><span className="bt-big gray">{s.unattempted+s.skipped}</span><span className="bt-den">/{s.total}</span></div>
                    <div>
                      <div className="acc-bar-wrap"><div className="acc-bar" style={{width:pct+'%',background:pct>=60?'#2e7d32':'#e65100'}}/></div>
                      <span className="acc-pct" style={{color:pct>=60?'#2e7d32':'#e65100'}}>{pct}%</span>
                    </div>
                  </div>
                )
              })()}
              {subjects.map(s => {
                const st = makeStats(getSubjQs(s))
                const score = st.correct*mCor - st.wrong*mNeg
                const pct = (st.correct+st.wrong) ? Math.round(st.correct/(st.correct+st.wrong)*100) : 0
                const sc = SC(s)
                return (
                  <div key={s} className="bt-row" onClick={()=>openReview(s)} style={{cursor:'pointer'}}>
                    <div className="bt-subj-cell">
                      <div className="bt-subj-dot" style={{background:sc.accent}}/>
                      <span className="bt-subj-name">{s}</span>
                      <span className="bt-subj-badge" style={{background:sc.light,color:sc.accent,border:`1px solid ${sc.border}`}}>{sc.label}</span>
                    </div>
                    <div><span className="bt-big" style={{color:score>=0?'#2e7d32':'#c62828'}}>{score>=0?'+':''}{score}</span></div>
                    <div><span className="bt-big green">{st.correct}</span><span className="bt-den">/{st.total}</span></div>
                    <div><span className="bt-big red">{st.wrong}</span><span className="bt-den">/{st.total}</span></div>
                    <div><span className="bt-big gray">{st.unattempted+st.skipped}</span><span className="bt-den">/{st.total}</span></div>
                    <div>
                      <div className="acc-bar-wrap"><div className="acc-bar" style={{width:pct+'%',background:sc.accent}}/></div>
                      <span className="acc-pct" style={{color:sc.accent}}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick review cards */}
          <div className="quick-grid">
            {subjects.map(s => {
              const st = makeStats(getSubjQs(s))
              const sc = SC(s)
              const pct = (st.correct+st.wrong) ? Math.round(st.correct/(st.correct+st.wrong)*100) : 0
              return (
                <div key={s} className="quick-card" style={{borderTop:`4px solid ${sc.accent}`}}>
                  <div className="qc-top">
                    <span className="qc-badge" style={{background:sc.light,color:sc.accent}}>{sc.label}</span>
                    <span className="qc-name">{s}</span>
                  </div>
                  <div className="qc-score" style={{color:sc.accent}}>{st.correct*mCor-st.wrong*mNeg} <span className="qc-score-s">marks</span></div>
                  <div className="qc-bar-wrap"><div className="qc-bar" style={{width:pct+'%',background:sc.accent}}/></div>
                  <div className="qc-stats">
                    <span className="qc-stat green">✓ {st.correct}</span>
                    <span className="qc-stat red">✗ {st.wrong}</span>
                    <span className="qc-stat orange">↩ {st.skipped}</span>
                    <span className="qc-stat gray">— {st.unattempted}</span>
                  </div>
                  <button className="qc-review-btn" style={{background:sc.accent}} onClick={()=>openReview(s)}>Review Questions →</button>
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* ════ REVIEW TAB ════ */}
      {tab === 'review' && (
        <div className="review-page anim">

          {/* Subject tabs */}
          <div className="review-subj-bar">
            {subjects.map(s => {
              const sc = SC(s); const st = makeStats(getSubjQs(s)); const isA = activeSubj===s
              return (
                <button key={s} className={`rsb-tab${isA?' active':''}`}
                  style={isA?{background:sc.accent,color:'#fff',borderColor:sc.accent}:{color:sc.accent,borderColor:sc.border}}
                  onClick={()=>switchSubj(s)}>
                  <span className="rsb-label">{sc.label}</span>
                  <span className="rsb-name">{s}</span>
                  <span className="rsb-stats">
                    <span style={{color:isA?'rgba(255,255,255,.8)':RES.correct.color}}>✓{st.correct}</span>
                    <span style={{color:isA?'rgba(255,255,255,.6)':RES.wrong.color}}>✗{st.wrong}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="review-layout">
            {/* ── Left sidebar ── */}
            <div className="review-sidebar">
              <div className="sidebar-head">
                QUESTIONS
                <span className="sidebar-count">{filteredQs.length}/{subjQs.length}</span>
              </div>

              {/* Filter buttons */}
              <div className="sidebar-filters">
                {[
                  ['all','All',null],
                  ['correct','✓ Correct','#2e7d32'],
                  ['wrong','✗ Wrong','#c62828'],
                  ['skipped','↩ Skipped','#e65100'],
                  ['unattempted','— Not Att.','#757575'],
                ].map(([m,l,c])=>{
                  const isA=filter===m
                  return (
                    <button key={m} className={`sf-btn${isA?' active':''}`}
                      style={isA&&c?{background:c,borderColor:c,color:'#fff'}:isA?{background:'#1a237e',borderColor:'#1a237e',color:'#fff'}:{}}
                      onClick={()=>switchFilter(m)}>{l}</button>
                  )
                })}
              </div>

              {/* Question dots */}
              <div className="qdot-grid">
                {filteredQs.map((q,i) => {
                  const isCur = i===curQ
                  const dotColor = isCur ? '#1a237e' : (RES[q.result]?.dot || '#bdbdbd')
                  return (
                    <div key={i} className={`qdot${isCur?' cur':''}`}
                      style={{background:dotColor, boxShadow:isCur?`0 0 0 2.5px white, 0 0 0 4px #1a237e`:''}}
                      onClick={()=>setCurQ(i)}>
                      {q.qnum||(subjQs.indexOf(q)+1)}
                    </div>
                  )
                })}
                {filteredQs.length===0 && (
                  <div style={{gridColumn:'1/-1',textAlign:'center',padding:'20px 0',color:'#aaa',fontSize:'.8rem'}}>
                    No questions in this filter
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="dot-legend">
                {Object.entries(RES).map(([k,v])=>(
                  <div key={k} className="dl-item">
                    <div className="dl-dot" style={{background:v.dot}}/>
                    <span>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Question panel ── */}
            <div className="question-panel">
              {!curQuestion ? (
                <div className="no-q">
                  <div style={{fontSize:'3rem',marginBottom:12}}>🔍</div>
                  <div style={{fontWeight:600,color:'#555',marginBottom:6}}>No questions to show</div>
                  <div style={{fontSize:'.82rem',color:'#999'}}>Try changing the filter or select another subject</div>
                </div>
              ) : (
                <>
                  {/* Q header */}
                  <div className="qp-header">
                    <div className="qp-header-left">
                      <span className="qp-qnum">Q {curQuestion.qnum || (subjQs.indexOf(curQuestion)+1)}</span>
                      {curQuestion.subject && (
                        <span className="qp-subj" style={{background:SC(curQuestion.subject).light, color:SC(curQuestion.subject).accent, border:`1px solid ${SC(curQuestion.subject).border}`}}>
                          {curQuestion.subject}
                        </span>
                      )}
                      <span className={`qp-type ${curQuestion.type==='INTEGER'?'int':'mcq'}`}>
                        {curQuestion.type==='INTEGER'?'Integer':'MCQ'}
                      </span>
                    </div>
                    <div className="qp-result" style={{background:RES[curQuestion.result]?.bg, color:RES[curQuestion.result]?.color, border:`1px solid ${RES[curQuestion.result]?.border}`}}>
                      {RES[curQuestion.result]?.label}
                    </div>
                  </div>

                  {/* Question content */}
                  <div className="qp-body">
                    {/* Images */}
                    {curQuestion.images && curQuestion.images.length > 0 ? (
                      <div className="qp-images">
                        {curQuestion.images.map((img,i)=>(
                          <img key={i} src={`data:image/png;base64,${img}`} alt={`Q${curQ+1}`}
                            style={{maxWidth:'100%',display:'block',margin:'0 auto 6px',borderRadius:4}}/>
                        ))}
                      </div>
                    ) : (
                      <div className="qp-text" dangerouslySetInnerHTML={{__html:(curQuestion.text||'').replace(/\n/g,'<br/>')}}/>
                    )}

                    {/* MCQ options */}
                    {curQuestion.type==='MCQ' && curQuestion.opts && (
                      <div className="qp-opts">
                        {['A','B','C','D'].map((lbl,i)=>{
                          const isCorrect = lbl===(curQuestion.correctAnswer||'').toUpperCase().trim()
                          const isYours   = lbl===(curQuestion.yourAnswer||'').toUpperCase().trim()
                          return (
                            <div key={lbl} className={`qp-opt${isCorrect?' correct':isYours&&!isCorrect?' wrong':''}`}>
                              <div className="qp-opt-lbl">{lbl}</div>
                              <div className="qp-opt-text">{curQuestion.opts[i]||`Option ${lbl}`}</div>
                              <div className="qp-opt-tag">
                                {isCorrect && isYours  && <span className="opt-tag green">✓ Correct Answer</span>}
                                {isCorrect && !isYours && <span className="opt-tag green">✓ Correct Answer</span>}
                                {!isCorrect && isYours && <span className="opt-tag red">✗ Your Answer</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Integer */}
                    {curQuestion.type==='INTEGER' && (
                      <div className="qp-int-box">
                        <div className="qp-int-row">
                          <span className="qp-int-lbl">Your answer</span>
                          <span className="qp-int-val" style={{color:curQuestion.result==='correct'?'#2e7d32':'#c62828',background:curQuestion.result==='correct'?'#e8f5e9':'#ffebee'}}>
                            {curQuestion.yourAnswer||'Not answered'}
                          </span>
                        </div>
                        <div className="qp-int-row">
                          <span className="qp-int-lbl">Correct answer</span>
                          <span className="qp-int-val" style={{color:'#2e7d32',background:'#e8f5e9'}}>{curQuestion.correctAnswer}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="qp-nav">
                    <button className="qpn-btn" disabled={curQ===0} onClick={()=>setCurQ(c=>c-1)}>← Prev</button>
                    <span className="qpn-count">{curQ+1} <span style={{color:'#aaa'}}>/</span> {filteredQs.length}</span>
                    <button className="qpn-btn primary" disabled={curQ>=filteredQs.length-1} onClick={()=>setCurQ(c=>c+1)}>Next →</button>
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

const BASE_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f0f2f5;color:#1a1a2e;font-family:'Inter',sans-serif;min-height:100vh}
@keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim{animation:up .35s ease both}
`

const UPLOAD_CSS = `
.upload-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:linear-gradient(135deg,#1a237e 0%,#283593 40%,#1565c0 100%)}
.upload-hero{background:white;border-radius:20px;padding:48px 40px;width:100%;max-width:520px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.25)}
.upload-logo{font-size:3rem;margin-bottom:16px}
.upload-hero h1{font-size:1.8rem;font-weight:800;color:#1a237e;margin-bottom:8px}
.upload-hero p{color:#666;font-size:.9rem;margin-bottom:28px}
.dropzone{background:#f8faff;border:2.5px dashed #c5cae9;border-radius:14px;padding:40px 24px;cursor:pointer;transition:all .2s;margin-bottom:16px}
.dropzone:hover,.dropzone.drag{border-color:#1a237e;background:#e8eaf6}
.dz-icon{font-size:2.4rem;margin-bottom:10px}
.dz-title{font-size:1rem;font-weight:700;color:#1a237e;margin-bottom:4px}
.dz-sub{font-size:.78rem;color:#888;margin-bottom:20px}
.dz-btn{display:inline-block;background:#1a237e;color:white;padding:10px 28px;border-radius:8px;font-weight:700;font-size:.85rem;cursor:pointer}
.upload-err{background:#ffebee;border:1px solid #ef9a9a;border-radius:8px;padding:12px;font-size:.82rem;color:#c62828;text-align:left;margin-bottom:12px}
.upload-hint{background:#e8eaf6;border-radius:10px;padding:14px 16px;font-size:.78rem;color:#555;text-align:left;line-height:1.9}
`

const APP_CSS = `
/* Top nav */
.topnav{background:#1a237e;height:58px;display:flex;align-items:center;padding:0 24px;gap:16px;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.tz-logo{display:flex;align-items:center;gap:8px;text-decoration:none;flex-shrink:0}
.tz-mark{width:32px;height:32px;background:#ffeb3b;border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:.8rem;color:#1a237e}
.tz-name{font-weight:800;font-size:1.05rem;color:white}
.nav-tabs{display:flex;gap:4px;flex:1;justify-content:center}
.nav-tab{padding:7px 18px;border-radius:8px;font-family:'Inter',sans-serif;font-weight:600;font-size:.82rem;cursor:pointer;border:none;background:rgba(255,255,255,.1);color:rgba(255,255,255,.7);transition:all .15s}
.nav-tab:hover{background:rgba(255,255,255,.18);color:white}
.nav-tab.active{background:white;color:#1a237e}
.nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.test-name-chip{font-size:.72rem;color:rgba(255,255,255,.75);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn-new{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:white;padding:6px 14px;border-radius:7px;font-size:.76rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif}
.btn-new:hover{background:rgba(255,255,255,.25)}

/* Overview */
.page{max-width:1200px;margin:0 auto;padding:24px 20px 80px}

/* Score hero */
.score-hero{background:linear-gradient(135deg,#0d1b4b,#1a237e);border-radius:16px;padding:32px;display:flex;align-items:center;gap:32px;margin-bottom:20px;flex-wrap:wrap}
.score-hero-left{flex-shrink:0}
.score-hero-label{font-size:.68rem;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,.6);font-family:'JetBrains Mono',monospace;margin-bottom:4px}
.score-hero-num{font-family:'JetBrains Mono',monospace;font-size:4rem;font-weight:700;line-height:1}
.score-hero-max{font-size:1.4rem;color:rgba(255,255,255,.4);font-weight:400}
.score-hero-sub{font-size:.76rem;color:rgba(255,255,255,.55);margin-top:8px}
.score-hero-cards{display:flex;gap:10px;flex:1;flex-wrap:wrap}
.hero-card{border-radius:12px;padding:16px 18px;text-align:center;flex:1;min-width:80px;border:1px solid transparent}
.hero-card-val{font-family:'JetBrains Mono',monospace;font-size:1.8rem;font-weight:700;margin-bottom:4px}
.hero-card-lbl{font-size:.6rem;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.5px}

/* Section card */
.section-card{background:white;border-radius:14px;overflow:hidden;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,.07)}
.section-header{padding:18px 22px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.section-title{font-size:1rem;font-weight:700;color:#1a237e}

/* Breakdown table */
.breakdown-table{width:100%}
.bt-head{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1.5fr;padding:10px 22px;background:#f8f9ff;font-size:.68rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.8px;font-family:'JetBrains Mono',monospace}
.bt-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1.5fr;padding:14px 22px;border-top:1px solid #f0f0f0;align-items:center;transition:background .12s}
.bt-row:hover{background:#f8f9ff}
.bt-overall{background:#fafbff}
.bt-subj-cell{display:flex;align-items:center;gap:8px}
.bt-subj-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.bt-subj-name{font-weight:600;font-size:.9rem}
.bt-subj-badge{font-size:.6rem;font-weight:700;padding:2px 7px;border-radius:10px;font-family:'JetBrains Mono',monospace}
.bt-big{font-family:'JetBrains Mono',monospace;font-size:1rem;font-weight:700}
.bt-big.green{color:#2e7d32}.bt-big.red{color:#c62828}.bt-big.gray{color:#888}
.bt-den{font-size:.72rem;color:#bbb;margin-left:2px}
.acc-bar-wrap{width:80px;height:5px;background:#eee;border-radius:99px;overflow:hidden;margin-bottom:3px}
.acc-bar{height:100%;border-radius:99px;transition:width .5s}
.acc-pct{font-family:'JetBrains Mono',monospace;font-size:.75rem;font-weight:700}

/* Quick cards grid */
.quick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.quick-card{background:white;border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.07);transition:transform .18s,box-shadow .18s}
.quick-card:hover{transform:translateY(-3px);box-shadow:0 6px 22px rgba(0,0,0,.12)}
.qc-top{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.qc-badge{font-size:.65rem;font-weight:800;padding:3px 9px;border-radius:20px;font-family:'JetBrains Mono',monospace}
.qc-name{font-weight:700;font-size:.9rem;color:#212121}
.qc-score{font-family:'JetBrains Mono',monospace;font-size:2rem;font-weight:800;margin-bottom:8px}
.qc-score-s{font-size:.75rem;font-weight:400;color:#888}
.qc-bar-wrap{height:6px;background:#eee;border-radius:99px;overflow:hidden;margin-bottom:10px}
.qc-bar{height:100%;border-radius:99px;transition:width .6s}
.qc-stats{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.qc-stat{font-size:.72rem;font-weight:700;font-family:'JetBrains Mono',monospace;padding:2px 8px;border-radius:6px;background:#f5f5f5}
.qc-stat.green{color:#2e7d32;background:#e8f5e9}
.qc-stat.red{color:#c62828;background:#ffebee}
.qc-stat.orange{color:#e65100;background:#fff3e0}
.qc-stat.gray{color:#888;background:#f5f5f5}
.qc-review-btn{width:100%;padding:9px;border:none;border-radius:8px;color:white;font-family:'Inter',sans-serif;font-weight:700;font-size:.8rem;cursor:pointer;transition:opacity .15s}
.qc-review-btn:hover{opacity:.88}

/* Review page */
.review-page{padding:0 0 80px}
.review-subj-bar{background:white;border-bottom:1px solid #e8e8e8;padding:0 24px;display:flex;gap:8px;overflow-x:auto;box-shadow:0 2px 6px rgba(0,0,0,.06)}
.rsb-tab{display:flex;align-items:center;gap:8px;padding:14px 18px;border:none;border-bottom:3px solid transparent;background:transparent;cursor:pointer;font-family:'Inter',sans-serif;font-size:.82rem;font-weight:600;white-space:nowrap;transition:all .15s;color:#666;margin-bottom:-1px}
.rsb-tab:hover{color:#1a237e;border-bottom-color:#c5cae9}
.rsb-tab.active{border-radius:10px 10px 0 0;border-bottom:3px solid transparent;margin-bottom:-3px}
.rsb-label{font-family:'JetBrains Mono',monospace;font-size:.65rem;font-weight:800;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.08)}
.rsb-tab.active .rsb-label{background:rgba(255,255,255,.25)}
.rsb-stats{display:flex;gap:5px;font-family:'JetBrains Mono',monospace;font-size:.65rem;font-weight:700}

/* Review layout */
.review-layout{display:flex;align-items:flex-start;gap:0;max-height:calc(100vh - 118px)}

/* Sidebar */
.review-sidebar{width:230px;flex-shrink:0;background:white;border-right:1px solid #e8e8e8;height:calc(100vh - 118px);overflow-y:auto;display:flex;flex-direction:column}
.sidebar-head{padding:12px 14px;font-size:.65rem;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:2px;font-family:'JetBrains Mono',monospace;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:white;z-index:10}
.sidebar-count{font-weight:400;color:#bbb}
.sidebar-filters{padding:8px;display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #f0f0f0}
.sf-btn{padding:6px 10px;border-radius:6px;font-size:.74rem;font-weight:600;cursor:pointer;border:1.5px solid #e0e0e0;background:white;color:#555;font-family:'Inter',sans-serif;text-align:left;transition:all .12s}
.sf-btn:hover{border-color:#1a237e;color:#1a237e}
.sf-btn.active{color:white}
.qdot-grid{padding:10px;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;flex:1}
.qdot{height:32px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:.6rem;font-weight:700;cursor:pointer;color:white;transition:transform .1s,box-shadow .1s}
.qdot:hover{transform:scale(1.1)}
.dot-legend{padding:10px 12px;border-top:1px solid #f0f0f0;display:flex;flex-direction:column;gap:5px;font-size:.65rem;color:#666}
.dl-item{display:flex;align-items:center;gap:6px}
.dl-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}

/* Question panel */
.question-panel{flex:1;background:#f8f9ff;height:calc(100vh - 118px);overflow-y:auto;padding:24px 28px}
.no-q{display:flex;flex-direction:column;align-items:center;justify-content:center;height:60%;color:#888;text-align:center}
.qp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px}
.qp-header-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.qp-qnum{font-family:'JetBrains Mono',monospace;font-size:.85rem;font-weight:700;background:white;border:1.5px solid #e0e0e0;padding:4px 12px;border-radius:6px;color:#333}
.qp-subj{font-size:.72rem;font-weight:700;padding:4px 11px;border-radius:20px;font-family:'JetBrains Mono',monospace}
.qp-type{font-size:.65rem;font-weight:700;padding:3px 9px;border-radius:20px;font-family:'JetBrains Mono',monospace}
.qp-type.mcq{background:#e3f2fd;color:#1565c0;border:1px solid #90caf9}
.qp-type.int{background:#fff3e0;color:#e65100;border:1px solid #ffcc80}
.qp-result{font-size:.8rem;font-weight:700;padding:6px 14px;border-radius:20px}
.qp-body{background:white;border-radius:14px;padding:22px;box-shadow:0 2px 10px rgba(0,0,0,.06);margin-bottom:14px}
.qp-images{text-align:center;margin-bottom:16px}
.qp-text{font-size:.95rem;line-height:1.9;color:#212121;white-space:pre-wrap;min-height:48px}
.qp-opts{display:flex;flex-direction:column;gap:10px;margin-top:18px}
.qp-opt{display:flex;align-items:flex-start;gap:12px;border:2px solid #e8e8e8;border-radius:10px;padding:13px 16px;background:#fafafa;transition:all .12s}
.qp-opt.correct{border-color:#2e7d32;background:#f1f8f3}
.qp-opt.wrong{border-color:#c62828;background:#fff5f5}
.qp-opt-lbl{font-family:'JetBrains Mono',monospace;font-size:.75rem;font-weight:700;min-width:28px;height:28px;border-radius:6px;background:#e8e8e8;color:#555;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.qp-opt.correct .qp-opt-lbl{background:#2e7d32;color:white}
.qp-opt.wrong .qp-opt-lbl{background:#c62828;color:white}
.qp-opt-text{flex:1;font-size:.9rem;color:#212121;line-height:1.65;padding-top:3px}
.qp-opt-tag{flex-shrink:0;display:flex;gap:4px;align-items:flex-start;padding-top:3px}
.opt-tag{font-size:.65rem;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap}
.opt-tag.green{background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7}
.opt-tag.red{background:#ffebee;color:#c62828;border:1px solid #ef9a9a}
.qp-int-box{margin-top:18px;background:#f8f9ff;border-radius:10px;overflow:hidden;border:1px solid #e0e0e0}
.qp-int-row{display:flex;align-items:center;padding:14px 18px;border-bottom:1px solid #eee}
.qp-int-row:last-child{border-bottom:none}
.qp-int-lbl{font-size:.8rem;color:#666;flex:1}
.qp-int-val{font-family:'JetBrains Mono',monospace;font-size:1.2rem;font-weight:700;padding:4px 16px;border-radius:8px}
.qp-nav{display:flex;align-items:center;justify-content:space-between;background:white;border-radius:12px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.qpn-btn{padding:9px 22px;border-radius:8px;font-family:'Inter',sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;border:1.5px solid #ddd;background:white;color:#333;transition:all .15s}
.qpn-btn:hover:not(:disabled){border-color:#1a237e;color:#1a237e}
.qpn-btn.primary{background:#1a237e;color:white;border-color:#1a237e}
.qpn-btn.primary:hover:not(:disabled){background:#283593}
.qpn-btn:disabled{opacity:.35;cursor:not-allowed}
.qpn-count{font-family:'JetBrains Mono',monospace;font-size:.88rem;color:#555;font-weight:700}
@media(max-width:768px){
  .review-sidebar{width:180px}
  .qdot-grid{grid-template-columns:repeat(4,1fr)}
  .score-hero{flex-direction:column}
  .bt-head,.bt-row{grid-template-columns:2fr 1fr 1fr 1fr}
  .bt-head>:nth-child(5),.bt-row>:nth-child(5),.bt-head>:last-child,.bt-row>:last-child{display:none}
  .question-panel{padding:16px}
}
`
