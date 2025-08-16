import logo from '../assets/underfoot-logo.png'

export default function Header({ onOpenDebug, onRestart }) {
  return (
    <header className='sticky top-0 z-10 bg-cm-panel/80 backdrop-blur border-b border-cm-border rounded-b-lg'>
      <div className='flex items-center justify-between px-4 py-2'>
        <div className='flex items-start gap-3'>
          <img src={logo} alt='Underfoot by CheckMarK logo' className='h-12 w-12 rounded-xl shadow-soft' />
          <div>
            <div className='font-extrabold text-lg tracking-wide'>Underfoot</div>
            <div className='text-xs text-cm-sub'>Underground travel planner — find the secret stuff.</div>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onRestart}
            className='px-3 py-2 rounded-lg bg-cm-card border border-cm-border hover:bg-[#232334]'>
            Restart
          </button>
          <button
            type='button'
            onClick={onOpenDebug}
            className='px-3 py-2 rounded-lg bg-cm-card border border-cm-border hover:bg-[#232334]'>
            Debug View
          </button>
        </div>
      </div>
    </header>
  )
}
