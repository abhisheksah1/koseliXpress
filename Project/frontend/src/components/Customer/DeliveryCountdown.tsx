import React, { useState, useEffect } from 'react';
import { Clock, MapPin, ChevronRight, Sparkles } from 'lucide-react';
import { CustomPageSection } from '../../types';

interface DeliveryCountdownProps {
  key?: string;
  sec: CustomPageSection;
  isLight: boolean;
}

interface ParsedTime {
  hour: number;
  minute: number;
}

// Helper to parse cutoff formatted values (e.g. "04:00 PM", "16:00", "4 PM")
const parseCutoffTime = (timeStr: string): ParsedTime => {
  const clean = (timeStr || '04:00 PM').trim().toUpperCase();
  
  // Format: 12:00 PM / AM
  const matchAmPm = clean.match(/^(\d+):(\d+)\s*(AM|PM)$/);
  if (matchAmPm) {
    let hour = parseInt(matchAmPm[1], 10);
    const minute = parseInt(matchAmPm[2], 10);
    const meridian = matchAmPm[3];
    if (meridian === 'PM' && hour < 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
  }
  
  // Format: 4 PM
  const matchAmPmShort = clean.match(/^(\d+)\s*(AM|PM)$/);
  if (matchAmPmShort) {
    let hour = parseInt(matchAmPmShort[1], 10);
    const meridian = matchAmPmShort[2];
    if (meridian === 'PM' && hour < 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;
    return { hour, minute: 0 };
  }

  // Format: 24h 16:30
  const match24 = clean.match(/^(\d+):(\d+)$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    return { hour, minute };
  }

  return { hour: 16, minute: 0 };
};

// Map common timezones to GMT offsets in milliseconds
const getTimezoneOffsetMs = (timezone: string): number => {
  const tz = timezone || 'Asia/Kathmandu';
  if (tz === 'Asia/Kolkata') return 5.5 * 60 * 60 * 1000;
  if (tz === 'Asia/Dubai') return 4 * 60 * 60 * 1000;
  if (tz === 'UTC' || tz === 'GMT') return 0;
  // Default: Nepal Time (NST) = UTC + 5:45
  return 5.75 * 60 * 60 * 1000;
};

export default function DeliveryCountdown({ sec, isLight }: DeliveryCountdownProps) {
  const { data } = sec;
  const rules = data.countdownRules || [];

  // Active rule state (index) when multiple delivery countdown rules are present
  const [activeRuleIdx, setActiveRuleIdx] = useState(0);

  // Remaining time state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isBefore: true,
    totalMs: 0
  });

  const activeRule = rules[activeRuleIdx] || {
    id: 'default',
    zoneName: 'Kathmandu Valley',
    cutoffTime: '04:00 PM',
    headingBefore: 'Need delivery today in Kathmandu Valley?',
    headingAfter: 'Need delivery tomorrow in Kathmandu Valley?',
    subHeading: 'Order closing in...',
    buttonText: 'Order Now',
    buttonUrl: '/category/all',
    timezone: 'Asia/Kathmandu',
    autoSwitch: true,
  };

  useEffect(() => {
    // Tick function
    const tick = () => {
      const now = new Date();
      const offsetMs = getTimezoneOffsetMs(activeRule.timezone);
      
      // Compute simulated current date object representing the target timezone
      const tzNow = new Date(now.getTime() + offsetMs);

      const year = tzNow.getUTCFullYear();
      const month = tzNow.getUTCMonth();
      const date = tzNow.getUTCDate();

      const { hour: cutoffHour, minute: cutoffMinute } = parseCutoffTime(activeRule.cutoffTime);

      // Construct target cutoff date for today in target timezone
      const tzCutoffToday = new Date(Date.UTC(year, month, date, cutoffHour, cutoffMinute, 0, 0));

      const isBeforeTodayCutoff = tzNow.getTime() < tzCutoffToday.getTime();

      let targetCutoffDate: Date;
      let isBefore = true;

      if (isBeforeTodayCutoff) {
        targetCutoffDate = tzCutoffToday;
        isBefore = true;
      } else {
        if (activeRule.autoSwitch !== false) {
          // Switch to tomorrow's cutoff
          targetCutoffDate = new Date(Date.UTC(year, month, date + 1, cutoffHour, cutoffMinute, 0, 0));
          isBefore = false;
        } else {
          // Auto switch is disabled - target today's cutoff (it will report <=0 remaining time)
          targetCutoffDate = tzCutoffToday;
          isBefore = true;
        }
      }

      // Difference in real world time
      const remainingMs = Math.max(0, targetCutoffDate.getTime() - tzNow.getTime());

      // Format countdown parts
      const seconds = Math.floor((remainingMs / 1000) % 60);
      const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
      const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isBefore,
        totalMs: remainingMs
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeRule, activeRuleIdx]);

  if (rules.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl">
        No active delivery countdown rules configured. Please configure in Page Builder.
      </div>
    );
  }

  // Display customizations
  const showDays = data.countdownShowDays !== false;
  const showHours = data.countdownShowHours !== false;
  const showMinutes = data.countdownShowMinutes !== false;
  const showSeconds = data.countdownShowSeconds !== false;

  // Custom styling
  const customBgColor = data.countdownBgColor || '#ffffff';
  const customBgImage = data.countdownBgImage || '';
  const customOverlayColor = data.countdownOverlayColor || 'rgba(0,0,0,0)';
  const customHeadingColor = data.countdownHeadingColor || '#1e293b';
  const customSubHeadingColor = data.countdownSubHeadingColor || '#64748b';
  const customTimerBoxColor = data.countdownTimerBoxColor || '#f1f5f9';
  const customTimerTextColor = data.countdownTimerTextColor || '#f43f5e';
  const customBtnColor = data.countdownBtnColor || '#e11d48';
  const customBtnTextColor = data.countdownBtnTextColor || '#ffffff';
  const customBorderRadius = data.countdownBorderRadius || '16px';

  // Responsive padding/margin styles
  const secId = sec.id;

  return (
    <section 
      key={`delivery-sec-${secId}`} 
      id={`countdown-widget-${secId}`}
      className="relative w-full max-w-5xl mx-auto overflow-hidden shadow-xs border border-slate-100 transition-all duration-350"
      style={{
        backgroundColor: customBgColor,
        borderRadius: customBorderRadius,
        ...(customBgImage ? {
          backgroundImage: `url(${customBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {})
      }}
    >
      {/* Background Overlay */}
      {customBgImage && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none" 
          style={{ backgroundColor: customOverlayColor, borderRadius: customBorderRadius }}
        />
      )}

      {/* Responsive Style Tag */}
      <style>{`
        #countdown-widget-${secId} {
          padding: ${data.countdownPaddingMobile || '20px 16px'};
          margin: ${data.countdownMarginMobile || '12px auto'};
        }
        @media (min-width: 640px) {
          #countdown-widget-${secId} {
            padding: ${data.countdownPaddingTablet || '28px 24px'};
            margin: ${data.countdownMarginTablet || '16px auto'};
          }
        }
        @media (min-width: 1024px) {
          #countdown-widget-${secId} {
            padding: ${data.countdownPaddingDesktop || '36px 32px'};
            margin: ${data.countdownMarginDesktop || '20px auto'};
          }
        }
      `}</style>

      {/* Widget Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        
        {/* Multizone Tabs Selector */}
        {rules.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6 p-1 bg-slate-100/80 backdrop-blur-xs rounded-lg max-w-full">
            {rules.map((rule: any, rIdx: number) => (
              <button
                key={rule.id || rIdx}
                type="button"
                onClick={() => setActiveRuleIdx(rIdx)}
                className={`px-3.5 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition cursor-pointer select-none flex items-center gap-1 ${
                  activeRuleIdx === rIdx
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                {rule.zoneName}
              </button>
            ))}
          </div>
        )}

        {/* Heading */}
        <h2 
          className="text-lg sm:text-2xl font-serif font-bold leading-tight tracking-tight max-w-2xl"
          style={{ color: customHeadingColor }}
        >
          {timeLeft.isBefore 
            ? (activeRule.headingBefore || `Need delivery today in ${activeRule.zoneName}?`)
            : (activeRule.headingAfter || `Need delivery tomorrow in ${activeRule.zoneName}?`)
          }
        </h2>

        {/* Sub Heading */}
        {activeRule.subHeading && (
          <p 
            className="text-xs sm:text-sm font-sans tracking-wide mt-2 font-medium"
            style={{ color: customSubHeadingColor }}
          >
            {activeRule.subHeading}
          </p>
        )}

        {/* Countdown Box */}
        <div className="flex items-center gap-2 sm:gap-4 mt-6">
          {showDays && (
            <div className="flex flex-col items-center">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-3xl font-mono font-black shadow-xs border border-black/5"
                style={{ backgroundColor: customTimerBoxColor, color: customTimerTextColor }}
              >
                {String(timeLeft.days).padStart(2, '0')}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">
                Days
              </span>
            </div>
          )}

          {showDays && showHours && <span className="text-xl font-bold opacity-30 select-none pb-5">:</span>}

          {showHours && (
            <div className="flex flex-col items-center">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-3xl font-mono font-black shadow-xs border border-black/5"
                style={{ backgroundColor: customTimerBoxColor, color: customTimerTextColor }}
              >
                {String(timeLeft.hours).padStart(2, '0')}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">
                Hours
              </span>
            </div>
          )}

          {showHours && showMinutes && <span className="text-xl font-bold opacity-30 select-none pb-5">:</span>}

          {showMinutes && (
            <div className="flex flex-col items-center">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-3xl font-mono font-black shadow-xs border border-black/5"
                style={{ backgroundColor: customTimerBoxColor, color: customTimerTextColor }}
              >
                {String(timeLeft.minutes).padStart(2, '0')}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">
                Minutes
              </span>
            </div>
          )}

          {showMinutes && showSeconds && <span className="text-xl font-bold opacity-30 select-none pb-5">:</span>}

          {showSeconds && (
            <div className="flex flex-col items-center">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-3xl font-mono font-black shadow-xs border border-black/5 animate-pulse"
                style={{ backgroundColor: customTimerBoxColor, color: customTimerTextColor }}
              >
                {String(timeLeft.seconds).padStart(2, '0')}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">
                Seconds
              </span>
            </div>
          )}
        </div>

        {/* Past cutoff / Completed Indicator */}
        {timeLeft.totalMs === 0 && !activeRule.autoSwitch && (
          <div className="mt-4 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-[10px] text-rose-600 font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            Same-day Order Window Completed (Closed)
          </div>
        )}

        {/* Optional Button Redirect CTA */}
        {activeRule.buttonText && activeRule.buttonUrl && (
          <a
            href={activeRule.buttonUrl}
            className="mt-6 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-black tracking-wider transition uppercase hover:opacity-90 select-none cursor-pointer"
            style={{ backgroundColor: customBtnColor, color: customBtnTextColor }}
          >
            {activeRule.buttonText}
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Zone Cutoff Indicator */}
        <div className="mt-5 text-[9.5px] font-medium text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Zone Cutoff: {activeRule.cutoffTime} in {activeRule.timezone.replace('Asia/', '')} NST Time
        </div>
      </div>
    </section>
  );
}
