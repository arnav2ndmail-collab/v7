import { useState, useRef } from 'react'
import Head from 'next/head'

export default function Analyser() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [drag, setDrag] = useState(false)
  const [curQ, setCurQ] = useState(0)
  const [filterMode, setFilterMode] = useState('all') // all | correct | wrong | skipped | unattempted
  const fileRef = useRef()

  const loadFile = async (file) => {
    setErr(''); setData(null)
    try {
      const text = await file.text()
      const d = JSON.parse(text)
      if (!d.questions || !Array.isArray(d.questions)) throw new Error('Invalid result file — no questions found')
      setData(d); setCurQ(0); setFilterMode('all')
    } catch(e) {
      setErr('❌ ' + e.message)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) loadFile(f)
  }

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
      <div className="wrap narrow anim">
        <div className="page-hero">
          <h2>📊 Test Analyser</h2>
          <p>Upload the output file downloaded after submitting a test to see detailed analysis</p>
        </div>
        <div
          className={`up-zone${drag?' drag':''}`}
          onDragOver={e=>{e.preventDefault();setDrag(true)}}
          onDragLeave={()=>setDrag(false)}
          onDrop={handleDrop}
          onClick={()=>fileRef.current.click()}
        >
          <div className="up-icon">📥</div>
          <div className="up-title">Drop result file here</div>
          <div className="up-sub">The .json file downloaded after submitting a test</div>
          <div className="btn-primary" style={{display:'inline-block',padding:'9px 24px',cursor:'pointer'}}>Choose File</div>
          <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={e=>{if(e.target.files[0])loadFile(e.target.files[0])}}/>
        </div>
        {err && <div className="err-box">{err}</div>}
        <div className="info-card" style={{marginTop:18}}>
          <div className="info-card-title">How to get the output file?</div>
          <div style={{fontSize:'.82rem',color:'#555',lineHeight:2}}>
            1. Complete a test on TestZyro<br/>
            2. On the result screen, click <strong>📥 Download Output File</strong><br/>
            3. Come back here and upload that file<br/>
            4. See full question-by-question analysis ✅
          </div>
        </div>
      </div>
    </>
  )

  // ── Analysis view ──────────────────────────────────────────────────────────
  const qs = data.questions || []
  const filteredQs = qs.filter(q => {
    if (filterMode === 'all') return true
    return q.result === filterMode
  })

  const cur = filteredQs[curQ]
  const subjectList = [...new Set(qs.map(q => q.subject).filter(Boolean))]

  // Per-subject stats
  const subjStats = data.subjStats || {}
  // Also compute from questions if not in file
  if (!Object.keys(subjStats).length) {
    qs.forEach(q => {
      const s = q.subject || 'Other'
      if (!subjStats[s]) subjStats[s] = { cor:0, wrg:0, skp:0, un:0 }
      if (q.result === 'correct') subjStats[s].cor++
      else if (q.result === 'wrong') subjStats[s].wrg++
      else if (q.result === 'skipped') subjStats[s].skp++
      else subjStats[s].un++
    })
  }

  const SUBJ_COLORS = {
    'Physics':      '#1a237e',
    'Chemistry':    '#1b5e20',
    'Maths':        '#b71c1c',
    'English & LR': '#4a148c',
  }
  const getSubjColor = (s) => SUBJ_COLORS[s] || '#37474f'

  const resultColor = { correct:'#2e7d32', wrong:'#c62828', skipped:'#e65100', unattempted:'#888' }
  const resultLabel = { correct:'✓ Correct', wrong:'✗ Wrong', skipped:'↩ Marked/Skipped', unattempted:'— Not Attempted' }
  const resultBg    = { correct:'#e8f5e9', wrong:'#ffebee', skipped:'#fff3e0', unattempted:'#f5f5f5' }

  const totalAttempted = data.correct + data.wrong
  const accuracy = totalAttempted ? Math.round(data.correct / totalAttempted * 100) : 0

  return (
    <>
      <Head>
        <title>TestZyro — Analyser: {data.testTitle}</title>
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
          <a href="/analyser" className="nb active">📊 Analyser</a>
        </nav>
        <button className="btn-sm" onClick={()=>setData(null)}>↩ Upload New</button>
      </header>

      <div className="analyser-wrap anim">
        {/* ── Score Header ── */}
        <div className="score-header">
          <div className="score-header-left">
            <div className="score-test-name">{data.testTitle}</div>
            <div className="score-meta">
              {data.subject && <span className="score-tag" style={{background:'#e8eaf6',color:'#1a237e'}}>{data.subject}</span>}
              <span className="score-tag">{new Date(data.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
              <span className="score-tag">{Math.floor((data.duration||0)/60)}m {(data.duration||0)%60}s</span>
            </div>
          </div>
          <div className="score-big">
            <div className="score-num" style={{color: data.score>=0?'#1b5e20':'#c62828'}}>{data.score}</div>
            <div className="score-denom">/{data.maxScore}</div>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="summary-grid">
          {[
            ['✓ Correct',   data.correct,     '#e8f5e9','#2e7d32','correct'],
            ['✗ Wrong',     data.wrong,       '#ffebee','#c62828','wrong'],
            ['↩ Skipped',   data.skipped,     '#fff3e0','#e65100','skipped'],
            ['— Unattempted',data.unattempted,'#f5f5f5','#888',   'unattempted'],
            ['🎯 Accuracy', accuracy+'%',     '#e3f2fd','#1565c0', null],
            ['⏱ Time',      `${Math.floor((data.duration||0)/60)}m`,'#f3e5f5','#6a1b9a', null],
          ].map(([lbl,val,bg,color,mode])=>(
            <div key={lbl} className={`sum-card${filterMode===mode?' active':''}`}
              style={{background:bg,borderColor:color+'44',cursor:mode?'pointer':'default'}}
              onClick={()=>{if(mode){setFilterMode(p=>p===mode?'all':mode);setCurQ(0)}}}>
              <div className="sum-val" style={{color}}>{val}</div>
              <div className="sum-lbl">{lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Subject Breakdown ── */}
        {Object.keys(subjStats).length > 1 && (
          <div className="subj-breakdown">
            <div className="section-title">Subject-wise Breakdown</div>
            <div className="subj-grid">
              {Object.entries(subjStats).map(([s,st])=>{
                const color = getSubjColor(s)
                const tot = st.cor+st.wrg+(st.skp||0)+(st.un||0)
                const pct = tot ? Math.round(st.cor/tot*100) : 0
                const score = st.cor*(data.marksCorrect||3) - st.wrg*(data.marksWrong||1)
                return (
                  <div key={s} className="subj-card" style={{borderLeft:`4px solid ${color}`}}>
                    <div className="subj-card-name" style={{color}}>{s}</div>
                    <div className="subj-card-score">{score > 0 ? '+' : ''}{score} marks</div>
                    <div className="subj-bar-wrap">
                      <div className="subj-bar" style={{width:pct+'%',background:color}}/>
                    </div>
                    <div className="subj-card-stats">
                      <span style={{color:'#2e7d32'}}>✓{st.cor}</span>
                      <span style={{color:'#c62828'}}>✗{st.wrg}</span>
                      <span style={{color:'#e65100'}}>↩{st.skp||0}</span>
                      <span style={{color:'#888'}}>—{st.un||0}</span>
                      <span style={{color:color,fontWeight:700}}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Question Review ── */}
        <div className="review-layout">
          {/* Left: Question Navigator */}
          <div className="review-nav">
            <div className="review-nav-title">
              Questions
              <span className="review-nav-count">{filteredQs.length}/{qs.length}</span>
            </div>

            {/* Filter buttons */}
            <div className="filter-row">
              {[['all','All'],['correct','✓'],['wrong','✗'],['skipped','↩'],['unattempted','—']].map(([m,l])=>(
                <button key={m} className={`filter-btn${filterMode===m?' on':''}`}
                  style={filterMode===m?{background:resultColor[m]||'#1a237e',color:'white',borderColor:resultColor[m]||'#1a237e'}:{}}
                  onClick={()=>{setFilterMode(m);setCurQ(0)}}>{l}</button>
              ))}
            </div>

            {/* Question dots */}
            <div className="nav-dots">
              {filteredQs.map((q2,i)=>(
                <div key={i}
                  className={`nav-dot${i===curQ?' cur':''}`}
                  style={{background: i===curQ?'#1a237e':resultColor[q2.result]||'#888',color:'white'}}
                  onClick={()=>setCurQ(i)}>
                  {q2.qnum||qs.indexOf(q2)+1}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Question Detail */}
          <div className="review-detail">
            {!cur ? (
              <div className="empty-state"><span>👆</span><p>Select a question to review</p></div>
            ) : (
              <>
                <div className="detail-header">
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span className="detail-qnum">Q {cur.qnum || qs.indexOf(cur)+1}</span>
                    {cur.subject && <span className="detail-subj" style={{background:getSubjColor(cur.subject)+'18',color:getSubjColor(cur.subject),border:`1px solid ${getSubjColor(cur.subject)}30`}}>{cur.subject}</span>}
                    <span className="detail-type">{cur.type==='INTEGER'?'Integer':'MCQ'}</span>
                  </div>
                  <div className="detail-result-badge" style={{background:resultBg[cur.result],color:resultColor[cur.result],border:`1px solid ${resultColor[cur.result]}44`}}>
                    {resultLabel[cur.result]}
                  </div>
                </div>

                {/* Question text */}
                <div className="detail-qtext" dangerouslySetInnerHTML={{__html:(cur.text||'').replace(/\n/g,'<br/>')}}/>

                {/* Options */}
                {cur.type === 'MCQ' && cur.opts && (
                  <div className="detail-opts">
                    {['A','B','C','D'].map((lbl,i)=>{
                      const isCorrect = lbl === (cur.correctAnswer||'').toUpperCase()
                      const isYours   = lbl === (cur.yourAnswer||'').toUpperCase()
                      let cls = 'detail-opt'
                      if (isCorrect) cls += ' correct'
                      else if (isYours && !isCorrect) cls += ' wrong'
                      return (
                        <div key={lbl} className={cls}>
                          <span className="detail-opt-lbl">{lbl}</span>
                          <span className="detail-opt-text">{cur.opts[i]}</span>
                          <span className="detail-opt-tag">
                            {isCorrect && <span className="tag-correct">✓ Correct</span>}
                            {isYours && !isCorrect && <span className="tag-wrong">✗ Your answer</span>}
                            {isYours && isCorrect && <span className="tag-correct">✓ Your answer</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Integer answer */}
                {cur.type === 'INTEGER' && (
                  <div className="int-answer-box">
                    <div className="int-answer-row">
                      <span className="int-label">Your answer:</span>
                      <span className="int-val" style={{color: cur.result==='correct'?'#2e7d32':'#c62828'}}>
                        {cur.yourAnswer || '—'}
                      </span>
                    </div>
                    <div className="int-answer-row">
                      <span className="int-label">Correct answer:</span>
                      <span className="int-val" style={{color:'#2e7d32'}}>{cur.correctAnswer}</span>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="detail-nav">
                  <button className="btn-prev" disabled={curQ===0} onClick={()=>setCurQ(c=>c-1)}>← Prev</button>
                  <span style={{fontSize:'.78rem',color:'#888',fontFamily:'Roboto Mono,monospace'}}>{curQ+1} / {filteredQs.length}</span>
                  <button className="btn-next" disabled={curQ===filteredQs.length-1} onClick={()=>setCurQ(c=>c+1)}>Next →</button>
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
body{background:#f5f5f5;color:#212121;font-family:'Roboto',sans-serif;min-height:100vh}
.hdr{background:#1a237e;color:white;padding:0 24px;display:flex;align-items:center;height:56px;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3);position:sticky;top:0;z-index:100}
.logo{display:flex;align-items:center;gap:8px;cursor:pointer}
.logo-mark{width:32px;height:32px;background:#ffeb3b;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Roboto Mono',monospace;font-weight:700;font-size:.8rem;color:#1a237e}
.logo-txt{font-weight:700;font-size:1.1rem;color:white}.logo-txt span{color:#ffeb3b}
.nav{display:flex;align-items:center;gap:4px;flex:1}
.nb{padding:6px 14px;border-radius:4px;font-family:'Roboto',sans-serif;font-weight:500;font-size:.82rem;cursor:pointer;border:none;background:transparent;color:rgba(255,255,255,.8);transition:all .15s;text-decoration:none;display:inline-block}
.nb:hover{color:white;background:rgba(255,255,255,.1)}.nb.active{background:rgba(255,255,255,.2);color:white}
.btn-sm{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:white;padding:6px 13px;border-radius:6px;font-size:.78rem;font-weight:500;cursor:pointer;font-family:'Roboto',sans-serif}
.btn-sm:hover{background:rgba(255,255,255,.25)}
.wrap{max-width:800px;margin:0 auto;padding:28px 18px 80px}
.narrow{max-width:700px}
.anim{animation:up .3s ease both}
.page-hero{margin-bottom:20px}
.page-hero h2{font-size:1.5rem;font-weight:700;color:#1a237e;margin-bottom:4px}
.page-hero p{font-size:.83rem;color:#666}
.up-zone{background:white;border:2px dashed #ccc;border-radius:10px;padding:48px 24px;text-align:center;transition:all .22s;cursor:pointer}
.up-zone:hover,.up-zone.drag{border-color:#1a237e;background:#e8eaf6}
.up-icon{font-size:2.5rem;margin-bottom:10px}
.up-title{font-size:1rem;font-weight:700;color:#212121;margin-bottom:5px}
.up-sub{font-size:.78rem;color:#888;margin-bottom:16px}
.btn-primary{background:#1a237e;color:white;border:none;padding:9px 18px;border-radius:6px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Roboto',sans-serif}
.err-box{background:#ffebee;border:1px solid #ef9a9a;border-radius:8px;padding:12px 16px;font-size:.82rem;color:#c62828;margin-top:14px}
.info-card{background:white;border:1px solid #e0e0e0;border-radius:8px;padding:16px 18px}
.info-card-title{font-size:.72rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-family:'Roboto Mono',monospace}

/* Analyser layout */
.analyser-wrap{max-width:1100px;margin:0 auto;padding:20px 18px 80px}
.score-header{background:white;border:1px solid #e0e0e0;border-radius:10px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.score-test-name{font-size:1.05rem;font-weight:700;color:#1a237e;margin-bottom:6px}
.score-meta{display:flex;gap:6px;flex-wrap:wrap}
.score-tag{font-size:.68rem;background:#f5f5f5;border:1px solid #e0e0e0;padding:2px 9px;border-radius:20px;color:#555;font-family:'Roboto Mono',monospace}
.score-big{display:flex;align-items:baseline;gap:3px}
.score-num{font-family:'Roboto Mono',monospace;font-size:2.8rem;font-weight:700}
.score-denom{font-size:1rem;color:#888;font-family:'Roboto Mono',monospace}
.summary-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:14px}
.sum-card{background:white;border:1px solid #e0e0e0;border-radius:8px;padding:14px;text-align:center;transition:all .15s;border-width:1.5px}
.sum-card:hover{transform:translateY(-1px)}
.sum-card.active{box-shadow:0 0 0 2px #1a237e}
.sum-val{font-family:'Roboto Mono',monospace;font-size:1.6rem;font-weight:700;margin-bottom:3px}
.sum-lbl{font-size:.65rem;color:#666;text-transform:uppercase;letter-spacing:.5px}
.subj-breakdown{background:white;border:1px solid #e0e0e0;border-radius:10px;padding:18px;margin-bottom:14px}
.section-title{font-size:.7rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-family:'Roboto Mono',monospace;margin-bottom:12px}
.subj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.subj-card{background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;padding:14px}
.subj-card-name{font-weight:700;font-size:.88rem;margin-bottom:4px}
.subj-card-score{font-family:'Roboto Mono',monospace;font-size:1rem;font-weight:700;color:#212121;margin-bottom:8px}
.subj-bar-wrap{height:5px;background:#e0e0e0;border-radius:99px;margin-bottom:8px;overflow:hidden}
.subj-bar{height:100%;border-radius:99px;transition:width .5s ease}
.subj-card-stats{display:flex;gap:8px;font-size:.72rem;font-family:'Roboto Mono',monospace;font-weight:700}
.review-layout{display:flex;gap:14px;align-items:flex-start}
.review-nav{width:200px;flex-shrink:0;background:white;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;position:sticky;top:74px}
.review-nav-title{padding:10px 13px;border-bottom:1px solid #e0e0e0;font-size:.78rem;font-weight:700;color:#1a237e;display:flex;justify-content:space-between;align-items:center;font-family:'Roboto Mono',monospace;text-transform:uppercase;letter-spacing:1px}
.review-nav-count{font-size:.65rem;color:#888;font-weight:400}
.filter-row{display:flex;gap:3px;flex-wrap:wrap;padding:8px 10px;border-bottom:1px solid #e0e0e0}
.filter-btn{padding:3px 7px;border-radius:4px;font-size:.65rem;font-weight:700;cursor:pointer;border:1px solid #ddd;background:white;color:#555;font-family:'Roboto Mono',monospace;transition:all .12s}
.filter-btn.on{color:white}
.nav-dots{padding:8px;display:grid;grid-template-columns:repeat(5,1fr);gap:3px;max-height:400px;overflow-y:auto}
.nav-dot{height:26px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:'Roboto Mono',monospace;font-size:.58rem;font-weight:700;cursor:pointer;color:white;transition:all .1s}
.nav-dot:hover{opacity:.85;transform:scale(1.08)}
.nav-dot.cur{outline:2.5px solid #1a237e;outline-offset:1px}
.review-detail{flex:1;background:white;border:1px solid #e0e0e0;border-radius:10px;padding:20px;min-height:400px}
.detail-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px}
.detail-qnum{font-family:'Roboto Mono',monospace;font-size:.82rem;font-weight:700;background:#f5f5f5;padding:4px 12px;border-radius:4px;border:1px solid #ddd;color:#333}
.detail-subj{font-size:.68rem;font-weight:700;padding:3px 9px;border-radius:20px;font-family:'Roboto Mono',monospace}
.detail-type{font-size:.62rem;background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;padding:2px 8px;border-radius:20px;font-family:'Roboto Mono',monospace;font-weight:700}
.detail-result-badge{font-size:.75rem;font-weight:700;padding:4px 12px;border-radius:20px}
.detail-qtext{font-size:.93rem;line-height:1.85;color:#212121;background:#fafafa;border:1px solid #e0e0e0;border-radius:6px;padding:16px;margin-bottom:16px;white-space:pre-wrap}
.detail-opts{display:flex;flex-direction:column;gap:7px;margin-bottom:16px}
.detail-opt{display:flex;align-items:flex-start;gap:10px;border:1.5px solid #e0e0e0;border-radius:6px;padding:10px 13px;background:white}
.detail-opt.correct{border-color:#2e7d32;background:#e8f5e9}
.detail-opt.wrong{border-color:#c62828;background:#ffebee}
.detail-opt-lbl{font-family:'Roboto Mono',monospace;font-size:.72rem;font-weight:700;color:#555;min-width:20px;background:#f5f5f5;border-radius:3px;text-align:center;padding:2px 5px;flex-shrink:0}
.detail-opt.correct .detail-opt-lbl{background:#2e7d32;color:white}
.detail-opt.wrong .detail-opt-lbl{background:#c62828;color:white}
.detail-opt-text{flex:1;font-size:.88rem;color:#212121;line-height:1.6}
.detail-opt-tag{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.tag-correct{font-size:.62rem;font-weight:700;color:#2e7d32;background:#e8f5e9;border:1px solid #a5d6a7;padding:1px 6px;border-radius:10px;white-space:nowrap}
.tag-wrong{font-size:.62rem;font-weight:700;color:#c62828;background:#ffebee;border:1px solid #ef9a9a;padding:1px 6px;border-radius:10px;white-space:nowrap}
.int-answer-box{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin-bottom:14px}
.int-answer-row{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.int-answer-row:last-child{margin-bottom:0}
.int-label{font-size:.78rem;color:#666;min-width:130px}
.int-val{font-family:'Roboto Mono',monospace;font-size:1.1rem;font-weight:700}
.detail-nav{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid #eee;margin-top:4px}
.btn-prev,.btn-next{padding:8px 16px;border-radius:4px;font-family:'Roboto',sans-serif;font-size:.78rem;font-weight:500;cursor:pointer;border:1px solid #ccc;background:white;color:#333;transition:all .12s}
.btn-prev:hover,.btn-next:hover{border-color:#1a237e;color:#1a237e}
.btn-prev:disabled,.btn-next:disabled{opacity:.35;cursor:not-allowed}
.empty-state{text-align:center;padding:60px 20px;color:#aaa}
.empty-state span{font-size:2.5rem;display:block;margin-bottom:12px}
.empty-state p{font-size:.85rem}
@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:700px){
  .review-layout{flex-direction:column}
  .review-nav{width:100%;position:static}
  .nav-dots{grid-template-columns:repeat(8,1fr)}
  .summary-grid{grid-template-columns:repeat(3,1fr)}
  .subj-grid{grid-template-columns:1fr}
}
`
