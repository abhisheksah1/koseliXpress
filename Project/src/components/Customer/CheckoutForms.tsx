import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { DatabaseState } from '../../types';

interface CheckoutFormsProps {
  isLight: boolean;
  senderName: string;
  setSenderName: (val: string) => void;
  senderEmail: string;
  setSenderEmail: (val: string) => void;
  senderPhone: string;
  setSenderPhone: (val: string) => void;
  receiverName: string;
  setReceiverName: (val: string) => void;
  receiverPhone: string;
  setReceiverPhone: (val: string) => void;
  deliveryDistrictId: string;
  setDeliveryDistrictId: (val: string) => void;
  districtsList: any[];
  selectedDistrict: any;
  deliveryAddress: string;
  setDeliveryAddress: (val: string) => void;
  orderNote: string;
  setOrderNote: (val: string) => void;
  preferredDeliveryDate: string;
  setPreferredDeliveryDate: (val: string) => void;
  isCalendarOpen: boolean;
  setIsCalendarOpen: (val: boolean) => void;
  calendarViewDate: Date;
  setCalendarViewDate: (val: Date | ((prev: Date) => Date)) => void;
  selectedCurrency: any;
  deliveryChargeConverted: number;
  state: DatabaseState;
  selectedTimeSlotId: string;
  setSelectedTimeSlotId: (val: string) => void;
}

export default function CheckoutForms({
  isLight,
  senderName,
  setSenderName,
  senderEmail,
  setSenderEmail,
  senderPhone,
  setSenderPhone,
  receiverName,
  setReceiverName,
  receiverPhone,
  setReceiverPhone,
  deliveryDistrictId,
  setDeliveryDistrictId,
  districtsList,
  selectedDistrict,
  deliveryAddress,
  setDeliveryAddress,
  orderNote,
  setOrderNote,
  preferredDeliveryDate,
  setPreferredDeliveryDate,
  isCalendarOpen,
  setIsCalendarOpen,
  calendarViewDate,
  setCalendarViewDate,
  selectedCurrency,
  deliveryChargeConverted,
  state,
  selectedTimeSlotId,
  setSelectedTimeSlotId,
}: CheckoutFormsProps) {
  const [isSlotCollapsed, setIsSlotCollapsed] = React.useState(true);

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. SENDER INFORMATION SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-2xs space-y-4 text-left">
        <div className="flex items-center gap-2 pb-2.5 border-b border-rose-50/80">
          <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs font-mono">1</span>
          <h4 className="text-xs font-bold text-slate-805 uppercase tracking-wider">Sender Contact Details</h4>
          <span className="text-[8.5px] bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded uppercase font-mono font-bold ml-auto select-none">Mandatory</span>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className={`block text-[9.5px] font-bold uppercase mb-1.5 ${isLight ? 'text-slate-650' : 'text-slate-400'}`}>Sender Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dinesh Chalise"
              className={`w-full p-3 border rounded-xl text-xs transition focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-455 font-semibold placeholder:text-slate-350 ${
                isLight ? 'bg-white text-slate-800 border-rose-150' : 'bg-[#050505] border-white/10 text-white'
              }`}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className={`block text-[9.5px] font-bold uppercase mb-1.5 ${isLight ? 'text-slate-650' : 'text-slate-400'}`}>Sender Email *</label>
              <input
                type="email"
                required
                placeholder="name@gmail.com"
                className={`w-full p-3 border rounded-xl text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-455 placeholder:text-slate-350 ${
                  isLight ? 'bg-white text-slate-800 border-rose-150' : 'bg-[#050505] border-white/10 text-white'
                }`}
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </div>
            <div>
              <label className={`block text-[9.5px] font-bold uppercase mb-1.5 ${isLight ? 'text-slate-650' : 'text-slate-400'}`}>Sender Phone with Country Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. +977 9801..."
                className={`w-full p-3 border rounded-xl text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-455 placeholder:text-slate-350 ${
                  isLight ? 'bg-white text-slate-800 border-rose-150' : 'bg-[#050505] border-white/10 text-white'
                }`}
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECEIVER INFORMATION SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-2xs space-y-4 text-left">
        <div className="flex items-center gap-2 pb-2.5 border-b border-rose-50/80">
          <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs font-mono">2</span>
          <h4 className="text-xs font-bold text-slate-805 uppercase tracking-wider">Recipient Details & Delivery</h4>
          <span className="text-[8.5px] bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded uppercase font-mono font-bold ml-auto select-none">Mandatory</span>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className={`block text-[9.5px] font-bold uppercase mb-1.5 ${isLight ? 'text-slate-650' : 'text-slate-400'}`}>Receiver Name *</label>
              <input
                type="text"
                required
                placeholder="Receiver's Name"
                className={`w-full p-3 border rounded-xl text-xs transition focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-455 font-semibold placeholder:text-slate-350 ${
                  isLight ? 'bg-white text-slate-800 border-rose-150' : 'bg-[#050505] border-white/10 text-white'
                }`}
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
              />
            </div>
            <div>
              <label className={`block text-[9.5px] font-bold uppercase mb-1.5 ${isLight ? 'text-slate-650' : 'text-slate-400'}`}>Receiver Phone *</label>
              <input
                type="text"
                required
                placeholder="Receiver's Contact No."
                className={`w-full p-3 border rounded-xl text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-455 placeholder:text-slate-350 ${
                  isLight ? 'bg-white text-slate-800 border-rose-150' : 'bg-[#050505] border-white/10 text-white'
                }`}
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={`block text-[9.5px] font-bold uppercase mb-1.5 ${isLight ? 'text-slate-650' : 'text-slate-400'}`}>Delivery District / City Location *</label>
            <select
              required
              className={`w-full p-3 border rounded-xl text-xs bg-white transition focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-455 font-semibold ${
                isLight ? 'text-slate-800 border-rose-150' : 'text-[#a2a2a2] border-white/10'
              }`}
              value={deliveryDistrictId}
              onChange={(e) => setDeliveryDistrictId(e.target.value)}
            >
              <option key="choose-fulfillment" value="">-- Choose Fulfillment Location --</option>
              {districtsList.map(d => {
                return (
                  <option key={d.id} value={d.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#050505] text-white'}>
                    {d.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className={`block text-[9.5px] font-bold uppercase mb-1.5 ${isLight ? 'text-slate-650' : 'text-slate-400'}`}>Receiver Detailed House / Street Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. House No. 42, Gali Lane, Ward Gate"
              className={`w-full p-3 border rounded-xl text-xs transition focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-455 font-semibold placeholder:text-slate-350 ${
                isLight ? 'bg-white text-slate-800 border-rose-150' : 'bg-[#050505] border-white/10 text-white'
              }`}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. ORDER NOTE / GIFT CARD MESSAGE SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-2xs space-y-4 text-left">
        <div className="flex items-center gap-2 pb-2.5 border-b border-rose-50/80">
          <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs font-mono">3</span>
          <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Greeting Cards & Special Notes</h4>
          <span className="text-[8.5px] bg-slate-50 text-slate-500 border border-rose-100 px-2 py-0.5 rounded uppercase font-mono font-bold ml-auto select-none">Optional</span>
        </div>

        <div>
          <input
            type="text"
            placeholder="e.g. Card message (e.g. 'Happy Birthday!') or special delivery instructions..."
            className={`w-full p-3 border rounded-xl text-xs transition focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-455 font-sans placeholder:text-slate-350 font-medium ${
              isLight ? 'bg-white text-slate-800 border-rose-150' : 'bg-[#050505] border-white/10 text-slate-350'
            }`}
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
          />
        </div>
      </div>

      {/* 4. PREFERRED DELIVERY DATE WITH CALENDAR */}
      <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-2xs space-y-4 text-left">
        <div className="flex items-center gap-2 pb-2.5 border-b border-rose-50/80">
          <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs font-mono">4</span>
          <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider font-sans">Preferred Delivery Date</h4>
          <span className="text-[8.5px] bg-slate-50 text-slate-500 border border-rose-100 px-2 py-0.5 rounded uppercase font-mono font-bold ml-auto select-none">Optional</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`w-full p-3 border rounded-xl text-xs flex justify-between items-center transition text-left cursor-pointer focus:ring-2 focus:ring-rose-500/15 ${
              isLight 
                ? 'bg-white text-slate-800 border-rose-150 hover:border-rose-250' 
                : 'bg-[#050505] text-white border-white/10 hover:border-white/20'
            }`}
          >
            <span className={`font-mono font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {preferredDeliveryDate ? preferredDeliveryDate : "Select custom delivery date"}
            </span>
            <Calendar className="w-4 h-4 text-rose-500" />
          </button>

          {isCalendarOpen && (() => {
            const viewYear = calendarViewDate.getFullYear();
            const viewMonth = calendarViewDate.getMonth();
            const monthNames = [
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ];

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const firstDayIdx = new Date(viewYear, viewMonth, 1).getDay();
            const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
            const previousMonthDays = new Date(viewYear, viewMonth, 0).getDate();

            const calendarDaysList: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

            const formatDateStringLocal = (d: Date) => {
              const year = d.getFullYear();
              const month = '' + (d.getMonth() + 1);
              const day = '' + d.getDate();
              return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
            };

            for (let i = firstDayIdx - 1; i >= 0; i--) {
              const dNum = previousMonthDays - i;
              const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
              const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
              calendarDaysList.push({
                day: dNum,
                isCurrentMonth: false,
                date: new Date(prevY, prevM, dNum)
              });
            }

            for (let dNum = 1; dNum <= totalDays; dNum++) {
              calendarDaysList.push({
                day: dNum,
                isCurrentMonth: true,
                date: new Date(viewYear, viewMonth, dNum)
              });
            }

            const remainingCells = 42 - calendarDaysList.length;
            for (let s = 1; s <= remainingCells; s++) {
              const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
              const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
              calendarDaysList.push({
                day: s,
                isCurrentMonth: false,
                date: new Date(nextY, nextM, s)
              });
            }

            return (
              <div className={`absolute left-0 right-0 mt-1.5 p-3.5 border rounded-xl shadow-2xl z-50 font-sans leading-relaxed text-xs ${
                isLight ? 'bg-white border-rose-150 text-slate-800' : 'bg-[#0b0b0b] border-white/10 text-slate-200'
              }`}>
                <div className={`flex justify-between items-center mb-3 pb-2 border-b ${
                  isLight ? 'border-rose-100/60' : 'border-white/5'
                }`}>
                  <span className={`font-bold tracking-wide text-[11px] font-mono ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {monthNames[viewMonth]} {viewYear}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1))}
                      className={`p-1 rounded transition cursor-pointer border-0 bg-transparent ${
                        isLight ? 'hover:bg-rose-50 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1))}
                      className={`p-1 rounded transition cursor-pointer border-0 bg-transparent ${
                        isLight ? 'hover:bg-rose-50 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-mono">
                  {calendarDaysList.map((item, idx) => {
                    const itemDate = new Date(item.date);
                    itemDate.setHours(0, 0, 0, 0);
                    const isPast = itemDate < today;
                    const formattedCurrent = formatDateStringLocal(item.date);
                    const isSelected = preferredDeliveryDate === formattedCurrent;

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          setPreferredDeliveryDate(formattedCurrent);
                          setIsCalendarOpen(false);
                        }}
                        className={`py-1 text-[10.5px] rounded transition cursor-pointer border-0 bg-transparent ${
                          !item.isCurrentMonth
                            ? (isLight ? 'text-slate-300' : 'text-slate-600')
                            : (isLight ? 'text-slate-800 font-semibold' : 'text-slate-200')
                        } ${
                          isPast
                            ? 'text-slate-300 hover:bg-transparent cursor-not-allowed line-through opacity-25'
                            : isLight ? 'hover:bg-rose-100/40 text-slate-800' : 'hover:bg-rose-100/20'
                        } ${
                          isSelected
                            ? 'bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs'
                            : ''
                        }`}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>

                <div className={`flex justify-between items-center mt-3 pt-2.5 border-t text-[9px] ${
                  isLight ? 'border-rose-100/60' : 'border-white/5'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredDeliveryDate('');
                      setIsCalendarOpen(false);
                    }}
                    className="text-slate-400 hover:text-rose-600 font-bold transition uppercase tracking-widest cursor-pointer border-0 bg-transparent"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = formatDateStringLocal(new Date());
                      setPreferredDeliveryDate(todayStr);
                      setIsCalendarOpen(false);
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold transition uppercase tracking-widest cursor-pointer border-0 bg-transparent"
                  >
                    Today
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* TIME SLOT SELECTION AREA */}
        {state.deliveryTimeSlotSettings?.isEnabled && selectedDistrict && state.deliveryTimeSlotSettings.enabledCityIds.includes(selectedDistrict.name) && (
          <div className="mt-4 pt-4 border-t border-rose-100 space-y-3.5">
            <div className="flex items-center gap-1.5 text-slate-800">
              <Clock className="w-4 h-4 text-rose-500" />
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Preferred Delivery Time Slot (+ Optional Add-On Fee)
              </label>
            </div>

            {!preferredDeliveryDate ? null : (() => {
              const todayObj = new Date();
              const year = todayObj.getFullYear();
              const month = String(todayObj.getMonth() + 1).padStart(2, '0');
              const day = String(todayObj.getDate()).padStart(2, '0');
              const todayDateStr = `${year}-${month}-${day}`;
              
              const timeSlotSettings = state.deliveryTimeSlotSettings;
              let filteredSlots = timeSlotSettings?.slots ? [...timeSlotSettings.slots] : [];
              const isTodaySelected = preferredDeliveryDate === todayDateStr;
              const minPrepLimit = timeSlotSettings?.minPreparationHours !== undefined ? timeSlotSettings.minPreparationHours : 3;
              
              if (isTodaySelected) {
                const currentHour = todayObj.getHours();
                const availableHourThreshold = currentHour + minPrepLimit;
                filteredSlots = filteredSlots.filter(s => s.startHour >= availableHourThreshold);
              }

              // Sort slots based on sequence
              filteredSlots.sort((a,b) => a.sequence - b.sequence);
              const rate = selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR;

              return (
                <div className="space-y-3 animate-in fade-in duration-200 text-left">
                  {filteredSlots.length === 0 ? (
                    <div className="text-[11px] text-slate-550 leading-relaxed font-sans select-none">
                      All today's priority time slots are closed as the {minPrepLimit}-hour preparation window has passed. Standard daily delivery schedule (Free) will apply, or select a future date above to choose specific priority slots.
                    </div>
                  ) : isSlotCollapsed ? (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between gap-3 bg-rose-50/25 p-3.5 rounded-xl border border-rose-100">
                        <div className="flex-1">
                          {!selectedTimeSlotId ? (
                            <div>
                              <p className="text-xs font-bold text-slate-800">Any Time on Preferred Date</p>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Standard daily delivery schedule (Free)</p>
                            </div>
                          ) : (() => {
                            const chosenSlot = filteredSlots.find(s => s.id === selectedTimeSlotId);
                            if (!chosenSlot) return (
                              <div>
                                <p className="text-xs font-bold text-slate-800">Any Time on Preferred Date</p>
                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Standard daily delivery schedule (Free)</p>
                              </div>
                            );
                            const chargeNPR = timeSlotSettings?.chargeType === 'flat' 
                              ? (timeSlotSettings.flatChargeNPR || 0) 
                              : (chosenSlot.additionalChargeNPR || 0);
                            const chargeConverted = chargeNPR * rate;
                            return (
                              <div>
                                <p className="text-xs font-semibold text-rose-900">{chosenSlot.name}</p>
                                <p className="text-[10.5px] text-slate-500 font-semibold mt-1">
                                  Scheduled window: {chosenSlot.timeDisplay} (+{selectedCurrency.symbol} {chargeConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })})
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSlotCollapsed(false)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50/50 text-[11px] font-bold text-rose-650 border border-rose-200 rounded-lg transition-all active:scale-[0.98] shadow-3xs cursor-pointer"
                        >
                          Change Time Slot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Normal Delivery Option */}
                        <div
                          onClick={() => {
                            setSelectedTimeSlotId('');
                            setIsSlotCollapsed(true);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition-all flex items-center justify-between ${
                            !selectedTimeSlotId 
                              ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${!selectedTimeSlotId ? 'border-rose-600' : 'border-slate-300'}`}>
                              {!selectedTimeSlotId && <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
                            </div>
                            <span>Any Time on Preferred Date</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono italic">Free</span>
                        </div>

                        {/* Configured Slots */}
                        {filteredSlots.map(slot => {
                          const isChosen = selectedTimeSlotId === slot.id;
                          const chargeNPR = timeSlotSettings?.chargeType === 'flat' 
                            ? (timeSlotSettings.flatChargeNPR || 0) 
                            : (slot.additionalChargeNPR || 0);
                          const chargeConverted = chargeNPR * rate;

                          return (
                            <div
                              key={slot.id}
                              onClick={() => {
                                setSelectedTimeSlotId(slot.id);
                                setIsSlotCollapsed(true);
                              }}
                              className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition-all flex items-center justify-between ${
                                isChosen 
                                  ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-xs' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isChosen ? 'border-rose-600' : 'border-slate-300'}`}>
                                  {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
                                </div>
                                <div className="flex flex-col">
                                  <span>{slot.name}</span>
                                  <span className="text-[9.5px] text-slate-400 font-normal">{slot.timeDisplay}</span>
                                </div>
                              </div>
                              <span className="text-[10.5px] font-mono text-rose-600 font-bold">
                                +{selectedCurrency.symbol} {chargeConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end p-0.5">
                        <button
                          type="button"
                          onClick={() => setIsSlotCollapsed(true)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 underline focus:outline-none cursor-pointer"
                        >
                          Keep Current Choice
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

    </div>
  );
}
