import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { DatabaseState } from '../../types';
import {
  CheckoutField,
  CheckoutSection,
  checkoutInputClass,
  checkoutSelectClass,
} from './CheckoutUI';

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
  manualDeliveryDistrict: string;
  setManualDeliveryDistrict: (val: string) => void;
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
  manualDeliveryDistrict,
  setManualDeliveryDistrict,
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
  state,
  selectedTimeSlotId,
  setSelectedTimeSlotId,
}: CheckoutFormsProps) {
  const [isSlotCollapsed, setIsSlotCollapsed] = React.useState(true);

  return (
    <div className="space-y-5 text-left">
      <CheckoutSection number={1} title="Sender Contact Details" badge="mandatory">
        <div className="space-y-3.5">
          <CheckoutField label="Sender Full Name" required>
            <input
              type="text"
              required
              placeholder="e.g. Dinesh Chalise"
              className={checkoutInputClass}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </CheckoutField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <CheckoutField label="Sender Email" required>
              <input
                type="email"
                required
                placeholder="name@gmail.com"
                className={`${checkoutInputClass} font-mono`}
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </CheckoutField>
            <CheckoutField label="Sender Phone with Country Code" required>
              <input
                type="text"
                required
                placeholder="e.g. +977 9801..."
                className={`${checkoutInputClass} font-mono`}
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
              />
            </CheckoutField>
          </div>
        </div>
      </CheckoutSection>

      <CheckoutSection number={2} title="Recipient Details & Delivery" badge="mandatory">
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <CheckoutField label="Receiver Name" required>
              <input
                type="text"
                required
                placeholder="Receiver's Name"
                className={checkoutInputClass}
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
              />
            </CheckoutField>
            <CheckoutField label="Receiver Phone" required>
              <input
                type="text"
                required
                placeholder="Receiver's Contact No."
                className={`${checkoutInputClass} font-mono`}
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
              />
            </CheckoutField>
          </div>

          <CheckoutField label="Delivery District / City Location" required>
            {districtsList.length > 0 ? (
              <select
                required
                className={checkoutSelectClass}
                value={deliveryDistrictId}
                onChange={(e) => setDeliveryDistrictId(e.target.value)}
              >
                <option value="" disabled>
                  -- Choose Fulfillment Location --
                </option>
                {districtsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kathmandu, Pokhara, Chitwan..."
                  className={checkoutInputClass}
                  value={manualDeliveryDistrict}
                  onChange={(e) => setManualDeliveryDistrict(e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  No delivery zones configured in admin — enter city or district manually.
                </p>
              </>
            )}
          </CheckoutField>

          <CheckoutField label="Receiver Detailed House / Street Address" required>
            <input
              type="text"
              required
              placeholder="e.g. House No. 42, Gali Lane, Ward Gate"
              className={checkoutInputClass}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </CheckoutField>
        </div>
      </CheckoutSection>

      <CheckoutSection number={3} title="Greeting Cards & Special Notes" badge="optional">
        <input
          type="text"
          placeholder="e.g. Card message ('Happy Birthday!') or special delivery instructions..."
          className={checkoutInputClass}
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
        />
      </CheckoutSection>

      <CheckoutSection number={4} title="Preferred Delivery Date" badge="optional">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`${checkoutInputClass} flex justify-between items-center text-left cursor-pointer hover:border-[#E91E63]/30`}
          >
            <span className="font-mono font-semibold">
              {preferredDeliveryDate || 'Select custom delivery date'}
            </span>
            <Calendar className="w-4 h-4 text-[#E91E63]" />
          </button>

          {isCalendarOpen && (() => {
            const viewYear = calendarViewDate.getFullYear();
            const viewMonth = calendarViewDate.getMonth();
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December',
            ];

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const firstDayIdx = new Date(viewYear, viewMonth, 1).getDay();
            const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
            const previousMonthDays = new Date(viewYear, viewMonth, 0).getDate();

            const calendarDaysList: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

            const formatDateStringLocal = (d: Date) => {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1);
              const day = String(d.getDate());
              return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
            };

            for (let i = firstDayIdx - 1; i >= 0; i--) {
              const dNum = previousMonthDays - i;
              const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
              const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
              calendarDaysList.push({
                day: dNum,
                isCurrentMonth: false,
                date: new Date(prevY, prevM, dNum),
              });
            }

            for (let dNum = 1; dNum <= totalDays; dNum++) {
              calendarDaysList.push({
                day: dNum,
                isCurrentMonth: true,
                date: new Date(viewYear, viewMonth, dNum),
              });
            }

            const remainingCells = 42 - calendarDaysList.length;
            for (let s = 1; s <= remainingCells; s++) {
              const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
              const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
              calendarDaysList.push({
                day: s,
                isCurrentMonth: false,
                date: new Date(nextY, nextM, s),
              });
            }

            return (
              <div className="absolute left-0 right-0 mt-1.5 p-3.5 border border-pink-100 rounded-xl shadow-2xl z-50 bg-white text-slate-800 text-xs">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-pink-50">
                  <span className="font-bold tracking-wide text-[11px] font-mono">
                    {monthNames[viewMonth]} {viewYear}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1))}
                      className="p-1 rounded hover:bg-pink-50 text-slate-600 cursor-pointer border-0 bg-transparent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1))}
                      className="p-1 rounded hover:bg-pink-50 text-slate-600 cursor-pointer border-0 bg-transparent"
                    >
                      <ChevronRight className="w-4 h-4 text-[#E91E63]" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
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
                          !item.isCurrentMonth ? 'text-slate-300' : 'text-slate-800 font-semibold'
                        } ${
                          isPast
                            ? 'text-slate-300 cursor-not-allowed line-through opacity-25'
                            : 'hover:bg-pink-50'
                        } ${
                          isSelected ? 'bg-[#E91E63] text-white font-bold hover:bg-[#C2185B] shadow-sm' : ''
                        }`}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-pink-50 text-[9px]">
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredDeliveryDate('');
                      setIsCalendarOpen(false);
                    }}
                    className="text-slate-400 hover:text-[#E91E63] font-bold uppercase tracking-widest cursor-pointer border-0 bg-transparent"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredDeliveryDate(formatDateStringLocal(new Date()));
                      setIsCalendarOpen(false);
                    }}
                    className="text-[#E91E63] hover:text-[#C2185B] font-bold uppercase tracking-widest cursor-pointer border-0 bg-transparent"
                  >
                    Today
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {state.deliveryTimeSlotSettings?.isEnabled && selectedDistrict && state.deliveryTimeSlotSettings.enabledCityIds.includes(selectedDistrict.name) && (
          <div className="mt-4 pt-4 border-t border-pink-50 space-y-3.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#E91E63]" />
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Preferred Delivery Time Slot
              </label>
            </div>

            {!preferredDeliveryDate ? null : (() => {
              const todayObj = new Date();
              const todayDateStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

              const timeSlotSettings = state.deliveryTimeSlotSettings;
              let filteredSlots = timeSlotSettings?.slots ? [...timeSlotSettings.slots] : [];
              const isTodaySelected = preferredDeliveryDate === todayDateStr;
              const minPrepLimit = timeSlotSettings?.minPreparationHours ?? 3;

              if (isTodaySelected) {
                const availableHourThreshold = todayObj.getHours() + minPrepLimit;
                filteredSlots = filteredSlots.filter((s) => s.startHour >= availableHourThreshold);
              }

              filteredSlots.sort((a, b) => a.sequence - b.sequence);
              const rate = selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR;

              return (
                <div className="space-y-3">
                  {filteredSlots.length === 0 ? (
                    <div className="text-[11px] text-slate-500 leading-relaxed">
                      All priority slots for today are closed. Select a future date or use standard delivery (Free).
                    </div>
                  ) : isSlotCollapsed ? (
                    <div className="flex items-center justify-between gap-3 bg-[#FFF8FA] p-3.5 rounded-xl border border-pink-100">
                      <div className="flex-1">
                        {!selectedTimeSlotId ? (
                          <div>
                            <p className="text-xs font-bold text-slate-800">Any Time on Preferred Date</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Standard daily delivery (Free)</p>
                          </div>
                        ) : (() => {
                          const chosenSlot = filteredSlots.find((s) => s.id === selectedTimeSlotId);
                          if (!chosenSlot) return null;
                          const chargeNPR = timeSlotSettings?.chargeType === 'flat'
                            ? (timeSlotSettings.flatChargeNPR || 0)
                            : (chosenSlot.additionalChargeNPR || 0);
                          return (
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{chosenSlot.name}</p>
                              <p className="text-[10.5px] text-slate-500 mt-1">
                                {chosenSlot.timeDisplay} (+{selectedCurrency.symbol}{' '}
                                {(chargeNPR * rate).toLocaleString(undefined, { maximumFractionDigits: 1 })})
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSlotCollapsed(false)}
                        className="px-3 py-1.5 bg-white hover:bg-pink-50 text-[11px] font-bold text-[#E91E63] border border-pink-200 rounded-lg cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div
                          onClick={() => {
                            setSelectedTimeSlotId('');
                            setIsSlotCollapsed(true);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between ${
                            !selectedTimeSlotId
                              ? 'bg-[#FCE4EC] border-[#E91E63]/40 text-slate-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>Any Time on Preferred Date</span>
                          <span className="text-[10px] text-slate-400 italic">Free</span>
                        </div>
                        {filteredSlots.map((slot) => {
                          const isChosen = selectedTimeSlotId === slot.id;
                          const chargeNPR = timeSlotSettings?.chargeType === 'flat'
                            ? (timeSlotSettings.flatChargeNPR || 0)
                            : (slot.additionalChargeNPR || 0);
                          return (
                            <div
                              key={slot.id}
                              onClick={() => {
                                setSelectedTimeSlotId(slot.id);
                                setIsSlotCollapsed(true);
                              }}
                              className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between ${
                                isChosen
                                  ? 'bg-[#FCE4EC] border-[#E91E63]/40 text-slate-800 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div>
                                <span className="block">{slot.name}</span>
                                <span className="text-[9.5px] text-slate-400">{slot.timeDisplay}</span>
                              </div>
                              <span className="text-[10.5px] font-mono text-[#E91E63] font-bold">
                                +{selectedCurrency.symbol}{(chargeNPR * rate).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSlotCollapsed(true)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer border-0 bg-transparent"
                      >
                        Keep Current Choice
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </CheckoutSection>
    </div>
  );
}
