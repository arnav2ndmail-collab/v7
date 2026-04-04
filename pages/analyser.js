import { useState, useRef } from 'react'
import Head from 'next/head'

const SUBJ_ORDER = ['Physics','Chemistry','Maths','English & LR']
const SUBJ_COLORS = {
  'Physics':      { accent:'#1a237e', light:'#e8eaf6', label:'PHY' },
  'Chemistry':    { accent:'#1b5e20', light:'#e8f5e9', label:'CHEM' },
  'Maths':        { accent:'#b71c1c', light:'#ffebee', label:'MATH' },
  'English & LR': { accent:'#4a148c', light:'#f3e5f5', label:'ENG' },
}
const getSubjStyle = s => SUBJ_COLORS[s] || { accent:'#37474f', light:'#eceff1', label:'Q' }

const RES_COLOR = { correct:'#2e7d32', wrong:'#c62828', skipped:'#e65100', unattempted:'#9e9e9e' }
const RES_BG    = { correct:'#e8f5e9', wrong:'#ffebee', skipped:'#fff3e0', unattempted:'#f5f5f5' }
const RES_LABEL = { correct:'✓ Correct', wrong:'✗ Wrong', skipped:'↩ Skipped', unattempted:'— Not Attempted' }

export default function Analyser() {
  const [data, setData]         = useState(null)
  const [err, setErr]           = useState('')
  const [drag, setDrag]         = useState(false)
  const [activeSubj, setActiveSubj] = useState(null)   // null = overview
  const [curQ, setCurQ]         = useState(0)
  const [filter, setFilter]     = useState('all')       // all|correct|wrong|skipped|unattempted
  const fileRef = useRef()

  const loadFile = async (file) => {
    setErr(''); setData(null)
    try {
      const text = await file.text()
      const d = JSON.parse(text)
      if (!d.questions || !Array.isArray(d.questions)) throw new Error('Invalid result file — no questions array found')
      // ensure every question has a result field
      d.questions = d.questions.map(q => ({
        ...q,
        result: q.result || (!q.yourAnswer ? 'unattempted' : q.yourAnswer==='skip'?'skipped':
          (String(q.correctAnswer||'').toUpperCase().trim()===String(q.yourAnswer||'').toUpperCase().trim())?'correct':'wrong')
      }))
      setData(d)
      setCurQ(0)
      setFilter('all')
      // default to first subject
      const subjects = SUBJ_ORDER.filter(s => d.questions.some(q => q.subject===s))
      setActiveSubj(subjects[0] || null)
    } catch(e) { setErr('❌ ' + e.message) }
  }

  const handleDrop = e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f) loadFile(f) }

  // ── Upload screen ──────────────────────────────────────────────────────────
  if (!data) return (
    <>
      <Head>
        <title>TestZyro — Test Analyser</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{CSS}</style>
      <header className="hdr">
        <div className="logo" onClick={()=>window.location.href='/'}>
          <div className="logo-mark">TZ</div>
          <div className="logo-txt">Test<span>Zyro</span></div>
        </div>
        <nav className="nav">
          <a href="/" className="nb">📚 Library</a>
          <span className="nb active">📊 Analyser</span>
        </nav>
      </header>
      <div className="upload-page anim">
        <div className="upload-card">
          <div className="upload-icon">📊</div>
          <h2>Test Analyser</h2>
          <p>Upload the output file downloaded after submitting a test</p>
          <div
            className={`up-zone${drag?' drag':''}`}
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={handleDrop}
            onClick={()=>fileRef.current.click()}
          >
            <div style={{fontSize:'2rem',marginBottom:8}}>📥</div>
            <div style={{fontWeight:600,marginBottom:4}}>Drop result .json file here</div>
            <div style={{fontSize:'.78rem',color:'#888',marginBottom:14}}>or click to browse</div>
            <div className="btn-upload">Choose File</div>
            <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={e=>{if(e.target.files[0])loadFile(e.target.files[0])}}/>
          </div>
          {err && <div className="err-box">{err}</div>}
          <div className="how-to">
            <b>How to get the output file:</b><br/>
            Complete a test → click <b>📥 Download Output File</b> on result screen → upload here
          </div>
        </div>
      </div>
    </>
  )

  // ── Data derived ───────────────────────────────────────────────────────────
  const allQs    = data.questions
  const subjects = SUBJ_ORDER.filter(s => allQs.some(q => q.subject===s))
  if (subjects.length===0) subjects.push('All')

  // per-subject stats
  const subjStats = {}
  subjects.forEach(s => {
    const qs = allQs.filter(q => q.subject===s || s==='All')
    subjStats[s] = {
      total: qs.length,
      correct: qs.filter(q=>q.result==='correct').length,
      wrong:   qs.filter(q=>q.result==='wrong').length,
      skipped: qs.filter(q=>q.result==='skipped').length,
      unattempted: qs.filter(q=>q.result==='unattempted').length,
      score: qs.filter(q=>q.result==='correct').length*(data.marksCorrect||3) - qs.filter(q=>q.result==='wrong').length*(data.marksWrong||1)
    }
  })

  // current subject's questions filtered
  const subjQs = activeSubj
    ? allQs.filter(q => q.subject===activeSubj)
    : allQs

  const filteredQs = subjQs.filter(q => filter==='all' || q.result===filter)
  const curQuestion = filteredQs[curQ] || null

  const totalAttempted = (data.correct||0)+(data.wrong||0)
  const accuracy = totalAttempted ? Math.round((data.correct||0)/totalAttempted*100) : 0

  // ── Main analyser layout ───────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>TestZyro Analyser — {data.testTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{CSS}</style>

      {/* Header */}
      <header className="hdr">
        <div className="logo" onClick={()=>window.location.href='/'}>
          <div className="logo-mark">TZ</div>
          <div className="logo-txt">Test<span>Zyro</span></div>
        </div>
        <div className="hdr-title">{data.testTitle}</div>
        <div className="hdr-right">
          <button className="btn-sm" onClick={()=>setData(null)}>↩ New File</button>
        </div>
      </header>

      {/* Score banner */}
      <div className="score-banner">
        <div className="score-banner-inner">
          <div className="score-main">
            <div className="score-label">Total Score</div>
            <div className="score-value" style={{color:data.score>=0?'#1b5e20':'#c62828'}}>
              {data.score}<span className="score-max">/{data.maxScore}</span>
            </div>
          </div>
          <div className="score-stats">
            {[
              ['✓ Correct',   data.correct||0,     '#2e7d32','#e8f5e9'],
              ['✗ Wrong',     data.wrong||0,        '#c62828','#ffebee'],
              ['↩ Skipped',   data.skipped||0,      '#e65100','#fff3e0'],
              ['— Not Att.',  data.unattempted||0,  '#888',   '#f5f5f5'],
              ['🎯 Accuracy', accuracy+'%',          '#1565c0','#e3f2fd'],
              ['⏱ Time',      Math.floor((data.duration||0)/60)+'m', '#4a148c','#f3e5f5'],
            ].map(([l,v,c,bg])=>(
              <div key={l} className="score-stat" style={{background:bg}}>
                <div className="score-stat-val" style={{color:c}}>{v}</div>
                <div className="score-stat-lbl">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject breakdown table */}
      <div className="breakdown-wrap">
        <div className="breakdown-title">Test Breakdown</div>
        <div className="breakdown-table">
          <div className="bt-head">
            <div className="bt-subj">Subject</div>
            <div className="bt-col">Score</div>
            <div className="bt-col">Correct</div>
            <div className="bt-col">Wrong</div>
            <div className="bt-col">Not Att.</div>
          </div>
          {/* Overall row */}
          {(() => {
            const tot = allQs.length
            const cor = allQs.filter(q=>q.result==='correct').length
            const wrg = allQs.filter(q=>q.result==='wrong').length
            const un  = allQs.filter(q=>q.result==='unattempted'||q.result==='skipped').length
            return (
              <div className="bt-row overall">
                <div className="bt-subj"><strong>Overall</strong></div>
                <div className="bt-col"><strong style={{color:data.score>=0?'#1b5e20':'#c62828'}}>{data.score}</strong><span className="bt-denom">/{data.maxScore}</span></div>
                <div className="bt-col"><span style={{color:'#2e7d32',fontWeight:700}}>{cor}</span><span className="bt-denom">/{tot}</span></div>
                <div className="bt-col"><span style={{color:'#c62828',fontWeight:700}}>{wrg}</span><span className="bt-denom">/{tot}</span></div>
                <div className="bt-col"><span style={{color:'#888',fontWeight:700}}>{un}</span><span className="bt-denom">/{tot}</span></div>
              </div>
            )
          })()}
          {subjects.map(s => {
            const st = subjStats[s]; const sc = getSubjStyle(s)
            return (
              <div key={s} className={`bt-row${activeSubj===s?' sel':''}`} onClick={()=>{setActiveSubj(s);setCurQ(0);setFilter('all')}}>
                <div className="bt-subj">
                  <span className="bt-subj-dot" style={{background:sc.accent}}/>
                  {s}
                </div>
                <div className="bt-col"><span style={{color:st.score>=0?'#1b5e20':'#c62828',fontWeight:700}}>{st.score>=0?'+':''}{st.score}</span></div>
                <div className="bt-col"><span style={{color:'#2e7d32',fontWeight:700}}>{st.correct}</span><span className="bt-denom">/{st.total}</span></div>
                <div className="bt-col"><span style={{color:'#c62828',fontWeight:700}}>{st.wrong}</span><span className="bt-denom">/{st.total}</span></div>
                <div className="bt-col"><span style={{color:'#888',fontWeight:700}}>{st.unattempted+st.skipped}</span><span className="bt-denom">/{st.total}</span></div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Q&A Review section */}
      <div className="review-wrap">
        <div className="review-title">
          QUESTIONS
          <span className="review-count">{filteredQs.length}/{subjQs.length}</span>
        </div>

        {/* Subject tabs */}
        <div className="subj-tabs-row">
          {subjects.map(s => {
            const sc = getSubjStyle(s)
            const isActive = activeSubj===s
            return (
              <button key={s} className={`subj-tab${isActive?' active':''}`}
                style={isActive?{background:sc.accent,color:'white',borderColor:sc.accent}:{borderColor:sc.accent+'44',color:sc.accent}}
                onClick={()=>{setActiveSubj(s);setCurQ(0);setFilter('all')}}>
                {sc.label} · {subjStats[s]?.total||0}
              </button>
            )
          })}
        </div>

        <div className="review-layout">
          {/* Left: navigator */}
          <div className="rev-nav">
            {/* Filter row */}
            <div className="filter-row">
              {[
                ['all','All', '#555'],
                ['correct','✓', '#2e7d32'],
                ['wrong','✗', '#c62828'],
                ['skipped','↩', '#e65100'],
                ['unattempted','—', '#888'],
              ].map(([m,l,c])=>(
                <button key={m}
                  className={`filter-btn${filter===m?' on':''}`}
                  style={filter===m?{background:c,color:'white',borderColor:c}:{color:c}}
                  onClick={()=>{setFilter(m);setCurQ(0)}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Dot grid */}
            <div className="dot-grid">
              {filteredQs.map((q,i) => {
                const bg = i===curQ?'#1a237e':RES_COLOR[q.result]||'#9e9e9e'
                return (
                  <div key={i} className={`q-dot${i===curQ?' cur':''}`}
                    style={{background:bg, outline:i===curQ?'2.5px solid #1a237e':''}}
                    onClick={()=>setCurQ(i)}>
                    {q.qnum||(subjQs.indexOf(q)+1)}
                  </div>
                )
              })}
              {filteredQs.length===0 && <div style={{color:'#aaa',fontSize:'.75rem',padding:'10px 0',gridColumn:'1/-1'}}>No questions</div>}
            </div>

            {/* Legend */}
            <div className="legend">
              {[['#2e7d32','Correct'],['#c62828','Wrong'],['#e65100','Skipped'],['#9e9e9e','Not Att.']].map(([c,l])=>(
                <div key={l} className="leg-item"><div className="leg-dot" style={{background:c}}/>{l}</div>
              ))}
            </div>
          </div>

          {/* Right: question detail */}
          <div className="rev-detail">
            {!curQuestion ? (
              <div className="empty-q">Select a question from the left</div>
            ) : (
              <>
                {/* Q header */}
                <div className="q-header">
                  <div className="q-header-left">
                    <span className="q-num-badge">Q {curQuestion.qnum || (subjQs.indexOf(curQuestion)+1)}</span>
                    {curQuestion.subject && (
                      <span className="q-subj-badge" style={{background:getSubjStyle(curQuestion.subject).light, color:getSubjStyle(curQuestion.subject).accent}}>
                        {curQuestion.subject}
                      </span>
                    )}
                    <span className="q-type-badge">{curQuestion.type==='INTEGER'?'Integer':'MCQ'}</span>
                  </div>
                  <div className="q-result-badge" style={{background:RES_BG[curQuestion.result], color:RES_COLOR[curQuestion.result]}}>
                    {RES_LABEL[curQuestion.result]}
                  </div>
                </div>

                {/* Question text */}
                <div className="q-text" dangerouslySetInnerHTML={{__html:(curQuestion.text||'Q'+curQuestion.qnum||'').replace(/\n/g,'<br/>')}}/>

                {/* MCQ Options */}
                {curQuestion.type==='MCQ' && curQuestion.opts && (
                  <div className="q-opts">
                    {['A','B','C','D'].map((lbl,i) => {
                      const isCorrect = lbl===(curQuestion.correctAnswer||'').toUpperCase().trim()
                      const isYours   = lbl===(curQuestion.yourAnswer||'').toUpperCase().trim()
                      let cls = 'q-opt'
                      if (isCorrect) cls += ' correct'
                      else if (isYours) cls += ' wrong'
                      return (
                        <div key={lbl} className={cls}>
                          <span className="q-opt-lbl">{lbl}</span>
                          <span className="q-opt-text">{curQuestion.opts[i]||`Option ${lbl}`}</span>
                          <span className="q-opt-tags">
                            {isCorrect && isYours && <span className="tag green">✓ Your answer</span>}
                            {isCorrect && !isYours && <span className="tag green">✓ Correct</span>}
                            {!isCorrect && isYours && <span className="tag red">✗ Your answer</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Integer answer */}
                {curQuestion.type==='INTEGER' && (
                  <div className="int-box">
                    <div className="int-row">
                      <span className="int-lbl">Your answer:</span>
                      <span className="int-val" style={{color:curQuestion.result==='correct'?'#2e7d32':'#c62828'}}>
                        {curQuestion.yourAnswer||'—'}
                      </span>
                    </div>
                    <div className="int-row">
                      <span className="int-lbl">Correct answer:</span>
                      <span className="int-val" style={{color:'#2e7d32'}}>{curQuestion.correctAnswer}</span>
                    </div>
                  </div>
                )}

                {/* Prev/Next */}
                <div className="q-nav">
                  <button className="nav-btn" disabled={curQ===0} onClick={()=>setCurQ(c=>c-1)}>← Prev</button>
                  <span className="q-nav-count">{curQ+1} / {filteredQs.length}</span>
                  <button className="nav-btn" disabled={curQ===filteredQs.length-1} onClick={()=>setCurQ(c=>c+1)}>Next →</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f0f2f5;color:#212121;font-family:'Roboto',sans-serif;min-height:100vh}
.hdr{background:#1a237e;color:white;padding:0 20px;display:flex;align-items:center;height:54px;gap:12px;box-shadow:0 2px 6px rgba(0,0,0,.25);position:sticky;top:0;z-index:100}
.logo{display:flex;align-items:center;gap:7px;cursor:pointer;text-decoration:none;flex-shrink:0}
.logo-mark{width:30px;height:30px;background:#ffeb3b;border-radius:5px;display:flex;align-items:center;justify-content:center;font-family:'Roboto Mono',monospace;font-weight:700;font-size:.76rem;color:#1a237e}
.logo-txt{font-weight:700;font-size:1rem;color:white}.logo-txt span{color:#ffeb3b}
.hdr-title{flex:1;font-size:.86rem;font-weight:600;color:rgba(255,255,255,.85);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hdr-right{flex-shrink:0}
.nav{display:flex;align-items:center;gap:4px;flex:1}
.nb{padding:5px 12px;border-radius:4px;font-family:'Roboto',sans-serif;font-weight:500;font-size:.8rem;cursor:pointer;border:none;background:transparent;color:rgba(255,255,255,.8);text-decoration:none;display:inline-block}
.nb:hover{color:white;background:rgba(255,255,255,.1)}.nb.active{background:rgba(255,255,255,.2);color:white}
.btn-sm{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:white;padding:5px 12px;border-radius:5px;font-size:.76rem;font-weight:500;cursor:pointer;font-family:'Roboto',sans-serif}
.btn-sm:hover{background:rgba(255,255,255,.25)}

/* Upload */
.upload-page{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 54px);padding:20px}
.upload-card{background:white;border-radius:12px;padding:36px;width:100%;max-width:480px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.1)}
.upload-icon{font-size:2.5rem;margin-bottom:12px}
.upload-card h2{font-size:1.4rem;font-weight:700;color:#1a237e;margin-bottom:6px}
.upload-card p{font-size:.82rem;color:#666;margin-bottom:20px}
.up-zone{background:#f5f5f5;border:2px dashed #ccc;border-radius:10px;padding:32px 16px;cursor:pointer;transition:all .2s}
.up-zone:hover,.up-zone.drag{border-color:#1a237e;background:#e8eaf6}
.btn-upload{display:inline-block;background:#1a237e;color:white;padding:8px 22px;border-radius:6px;font-weight:700;font-size:.82rem;cursor:pointer}
.err-box{background:#ffebee;border:1px solid #ef9a9a;border-radius:6px;padding:10px 14px;font-size:.8rem;color:#c62828;margin-top:12px;text-align:left}
.how-to{background:#e8eaf6;border-radius:8px;padding:12px 14px;font-size:.76rem;color:#555;margin-top:16px;text-align:left;line-height:1.8}
.anim{animation:up .3s ease both}

/* Score banner */
.score-banner{background:#1a237e;color:white;padding:16px 20px}
.score-banner-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.score-main{flex-shrink:0}
.score-label{font-size:.68rem;text-transform:uppercase;letter-spacing:1px;opacity:.75;margin-bottom:2px;font-family:'Roboto Mono',monospace}
.score-value{font-family:'Roboto Mono',monospace;font-size:2.4rem;font-weight:700}
.score-max{font-size:1rem;opacity:.6;font-weight:400}
.score-stats{display:flex;gap:8px;flex-wrap:wrap;flex:1}
.score-stat{border-radius:8px;padding:10px 14px;text-align:center;min-width:72px;flex:1}
.score-stat-val{font-family:'Roboto Mono',monospace;font-size:1.2rem;font-weight:700;margin-bottom:2px}
.score-stat-lbl{font-size:.58rem;color:#555;text-transform:uppercase;letter-spacing:.3px}

/* Breakdown table */
.breakdown-wrap{max-width:1200px;margin:16px auto;padding:0 16px}
.breakdown-title{font-size:.7rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-family:'Roboto Mono',monospace;margin-bottom:8px}
.breakdown-table{background:white;border-radius:10px;border:1px solid #e0e0e0;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.bt-head{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;padding:10px 16px;background:#f5f5f5;border-bottom:1px solid #e0e0e0;font-size:.7rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;font-family:'Roboto Mono',monospace}
.bt-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;padding:12px 16px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background .12s;font-size:.88rem}
.bt-row:last-child{border-bottom:none}
.bt-row:hover{background:#f5f7ff}
.bt-row.sel{background:#e8eaf6;border-left:3px solid #1a237e}
.bt-row.overall{cursor:default;background:#fafafa;font-size:.86rem}
.bt-row.overall:hover{background:#fafafa}
.bt-subj{display:flex;align-items:center;gap:7px;font-weight:600}
.bt-subj-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.bt-col{display:flex;align-items:center;gap:2px;font-family:'Roboto Mono',monospace;font-size:.85rem}
.bt-denom{font-size:.7rem;color:#aaa;margin-left:1px}

/* Review section */
.review-wrap{max-width:1200px;margin:16px auto 60px;padding:0 16px}
.review-title{font-size:.7rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-family:'Roboto Mono',monospace;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.review-count{font-size:.65rem;color:#aaa;font-weight:400}
.subj-tabs-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.subj-tab{padding:6px 14px;border-radius:20px;font-family:'Roboto Mono',monospace;font-size:.72rem;font-weight:700;cursor:pointer;border:1.5px solid;background:white;transition:all .15s}
.subj-tab:hover{opacity:.85}
.subj-tab.active{color:white!important}
.review-layout{display:flex;gap:14px;align-items:flex-start}

/* Left nav panel */
.rev-nav{width:220px;flex-shrink:0;background:white;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;position:sticky;top:62px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.filter-row{display:flex;gap:3px;padding:8px;border-bottom:1px solid #e0e0e0;flex-wrap:wrap}
.filter-btn{padding:4px 8px;border-radius:4px;font-size:.68rem;font-weight:700;cursor:pointer;border:1.5px solid #ddd;background:white;font-family:'Roboto Mono',monospace;transition:all .12s}
.filter-btn.on{color:white!important}
.filter-btn:hover{opacity:.8}
.dot-grid{padding:8px;display:grid;grid-template-columns:repeat(5,1fr);gap:3px;max-height:380px;overflow-y:auto}
.q-dot{height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:'Roboto Mono',monospace;font-size:.58rem;font-weight:700;cursor:pointer;color:white;transition:transform .1s}
.q-dot:hover{transform:scale(1.1)}
.q-dot.cur{outline-offset:2px}
.legend{padding:8px 10px;border-top:1px solid #e0e0e0;display:flex;flex-wrap:wrap;gap:6px}
.leg-item{display:flex;align-items:center;gap:3px;font-size:.6rem;color:#666}
.leg-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0}

/* Right detail panel */
.rev-detail{flex:1;background:white;border:1px solid #e0e0e0;border-radius:10px;padding:18px;min-height:300px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.empty-q{text-align:center;padding:60px 20px;color:#bbb;font-size:.85rem}
.q-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px}
.q-header-left{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.q-num-badge{font-family:'Roboto Mono',monospace;font-size:.8rem;font-weight:700;background:#f0f0f0;padding:3px 10px;border-radius:4px;border:1px solid #ddd;color:#333}
.q-subj-badge{font-size:.68rem;font-weight:700;padding:3px 9px;border-radius:20px;font-family:'Roboto Mono',monospace}
.q-type-badge{font-size:.62rem;background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;padding:2px 8px;border-radius:20px;font-family:'Roboto Mono',monospace;font-weight:700}
.q-result-badge{font-size:.74rem;font-weight:700;padding:4px 12px;border-radius:20px}
.q-text{font-size:.9rem;line-height:1.85;color:#212121;background:#fafafa;border:1px solid #e0e0e0;border-radius:6px;padding:14px;margin-bottom:14px;white-space:pre-wrap}
.q-opts{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}
.q-opt{display:flex;align-items:flex-start;gap:10px;border:1.5px solid #e0e0e0;border-radius:6px;padding:10px 12px;background:white}
.q-opt.correct{border-color:#2e7d32;background:#e8f5e9}
.q-opt.wrong{border-color:#c62828;background:#ffebee}
.q-opt-lbl{font-family:'Roboto Mono',monospace;font-size:.7rem;font-weight:700;color:#666;min-width:20px;background:#f0f0f0;border-radius:3px;text-align:center;padding:2px 5px;flex-shrink:0}
.q-opt.correct .q-opt-lbl{background:#2e7d32;color:white}
.q-opt.wrong .q-opt-lbl{background:#c62828;color:white}
.q-opt-text{flex:1;font-size:.86rem;color:#212121;line-height:1.6}
.q-opt-tags{flex-shrink:0;display:flex;gap:3px;align-items:center}
.tag{font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:10px;white-space:nowrap}
.tag.green{background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7}
.tag.red{background:#ffebee;color:#c62828;border:1px solid #ef9a9a}
.int-box{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin-bottom:14px}
.int-row{display:flex;align-items:center;gap:12px;margin-bottom:7px}
.int-row:last-child{margin-bottom:0}
.int-lbl{font-size:.78rem;color:#666;min-width:130px}
.int-val{font-family:'Roboto Mono',monospace;font-size:1.1rem;font-weight:700}
.q-nav{display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid #eee}
.q-nav-count{font-size:.76rem;color:#888;font-family:'Roboto Mono',monospace}
.nav-btn{padding:7px 16px;border-radius:4px;font-family:'Roboto',sans-serif;font-size:.78rem;font-weight:500;cursor:pointer;border:1px solid #ccc;background:white;color:#333;transition:all .12s}
.nav-btn:hover{border-color:#1a237e;color:#1a237e}
.nav-btn:disabled{opacity:.35;cursor:not-allowed}
@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:700px){
  .review-layout{flex-direction:column}
  .rev-nav{width:100%;position:static}
  .dot-grid{grid-template-columns:repeat(8,1fr)}
  .score-stats{justify-content:center}
  .bt-head,.bt-row{grid-template-columns:2fr 1fr 1fr 1fr}
  .bt-head>:last-child,.bt-row>:last-child{display:none}
}
`
