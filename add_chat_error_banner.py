from pathlib import Path
p=Path('/home/ubuntu/thai-order-project-vault/client/src/pages/ChatHub.tsx')
s=p.read_text()
needle='    <header className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-[#100c19]'
insert='    {threadsQuery.isError ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200"><span>โหลดห้องแชทไม่สำเร็จ: {threadsQuery.error.message}</span><Button size="sm" variant="outline" onClick={() => threadsQuery.refetch()} className="border-red-300/20 bg-transparent text-red-100">ลองใหม่</Button></div> : null}\n'
if needle not in s:
    raise SystemExit('needle not found')
s=s.replace(needle, insert+needle, 1)
p.write_text(s)
print('patched')
