import React, { useState, useEffect, useRef } from 'react';
import { Home, Brain, PlusCircle, Shield, User, LayoutGrid, X } from 'lucide-react';

export default function FloatingNav({ view, navTo, navigate, isDemoMode, onRestrictedAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight / 2 - 28 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0, moved: false });
  const containerRef = useRef(null);

  // Keep inside screen bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(Math.max(16, prev.x), window.innerWidth - 60),
        y: Math.min(Math.max(16, prev.y), window.innerHeight - 60)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e) => {
    // Only drag on left click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    // Prevent default to avoid text selection while dragging on desktop
    if (e.pointerType === 'mouse') {
      e.preventDefault();
    }

    const clientX = e.clientX;
    const clientY = e.clientY;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialPosX: position.x,
      initialPosY: position.y,
      moved: false
    };

    setIsDragging(true);

    const handlePointerMove = (ev) => {
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      
      if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
        dragRef.current.moved = true;
        setIsOpen(false); // Close menu when starting to drag
      }

      if (dragRef.current.moved) {
        let newX = dragRef.current.initialPosX + dx;
        let newY = dragRef.current.initialPosY + dy;

        // Bounds checking
        newX = Math.min(Math.max(16, newX), window.innerWidth - 60);
        newY = Math.min(Math.max(16, newY), window.innerHeight - 60);

        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (!dragRef.current.moved) {
        // It was a click! Trigger instantly on release.
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const tabs = [
    { id: "dashboard", icon: <Home size={18} />, label: "Home" },
    { id: "intel", icon: <Brain size={18} />, label: "Intel" },
    { id: "__add__", icon: <PlusCircle size={22} />, label: "Add", isAdd: true },
    { id: "operations", icon: <Shield size={18} />, label: "Ops" },
    { id: "profile", icon: <User size={18} />, label: "Profile" }
  ];

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'none', // Let clicks pass through empty space
        touchAction: 'none' // Prevent pull-to-refresh when dragging
      }}
    >
      {/* Menu Items (rendered above or below based on position) */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(-20px)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'all 0.05s ease',
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}
      >
        {tabs.map(t => {
          const active = view === t.id;
          const tabColor = t.isAdd || active ? "var(--ct-accent, #3b82f6)" : "var(--ct-muted, #9ca3af)";
          
          return (
            <button 
              key={t.id}
              onClick={(e) => {
                e.stopPropagation();
                if (t.isAdd) {
                  isDemoMode ? onRestrictedAction?.("Adding records") : navigate("form", { record: null });
                } else {
                  navTo(t.id);
                }
                setIsOpen(false);
              }}
              style={{
                background: t.isAdd ? 'var(--ct-accent, #3b82f6)' : active ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                width: 44,
                height: 44,
                borderRadius: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: t.isAdd ? '#fff' : tabColor,
                boxShadow: t.isAdd ? '0 4px 12px rgba(59, 130, 246, 0.5)' : 'none',
                transition: 'all 0.2s ease'
              }}
              title={t.label}
            >
              {t.icon}
            </button>
          );
        })}
      </div>

      {/* Main Draggable FAB */}
      <div 
        onPointerDown={handlePointerDown}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'var(--ct-glass-bg, rgba(255,255,255,0.1))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'pointer',
          pointerEvents: 'auto',
          boxShadow: isOpen ? '0 0 20px rgba(255,255,255,0.2)' : '0 4px 16px rgba(0,0,0,0.3)',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          transform: isDragging ? 'scale(1.05)' : 'scale(1)',
          color: '#fff'
        }}
      >
        {isOpen ? <X size={24} /> : <LayoutGrid size={24} />}
      </div>
    </div>
  );
}
