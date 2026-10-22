import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { StudentProfile } from '../types';
import { ShieldCheck, AlertCircle, Clock, CheckCircle2, RotateCw } from 'lucide-react';

interface Props {
  profile: StudentProfile;
}

export const CreditCardID: React.FC<Props> = ({ profile }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const photoDoc = profile.documents?.find((d) => d.type === 'PROFILE_PHOTO');
  const photoUrl = photoDoc?.fileUrl || null;

  const getStatusBadge = () => {
    switch (profile.verificationStatus) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
          </span>
        );
      case 'CORRECTION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertCircle className="w-3.5 h-3.5" /> Correction Needed
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-500/20 text-slate-300 border border-slate-500/40">
            Draft
          </span>
        );
    }
  };

  const qrData = JSON.stringify({
    rollNo: profile.admissionNumber,
    name: `${profile.firstName} ${profile.lastName}`,
    course: profile.courseAdmitted || 'Pending',
    batch: profile.timePeriodOfStudy,
    status: profile.verificationStatus,
  });

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-full max-w-[420px] h-[255px] cursor-pointer perspective-1000 select-none group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-700 transform-style-3d rounded-2xl shadow-2xl transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT OF ID CARD */}
          <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white backface-hidden overflow-hidden border border-white/15 flex flex-col justify-between shadow-inner">
            {/* Holographic / Metallic Sheen Background Effect */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

            {/* Header: College Crest & Status */}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 flex items-center justify-center font-black shadow-lg">
                  <ShieldCheck className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-blue-200 leading-tight">
                    APEX COLLEGE
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                    Digital Student Card
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                <RotateCw className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* Middle: EMV Chip Graphic + Photo + Primary Details */}
            <div className="flex items-center gap-4 relative z-10 mt-1">
              {/* Photo Frame */}
              <div className="w-20 h-24 rounded-xl overflow-hidden bg-slate-800 border-2 border-amber-400/60 shadow-md flex-shrink-0 flex items-center justify-center">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={profile.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <div className="w-9 h-9 mx-auto rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {profile.firstName.charAt(0)}
                      {profile.lastName.charAt(0)}
                    </div>
                    <span className="text-[9px] mt-1 block">No Photo</span>
                  </div>
                )}
              </div>

              {/* Names & Admission Data */}
              <div className="flex-1 min-w-0">
                {/* Chip Graphic */}
                <div className="w-10 h-7 rounded bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 border border-amber-500/50 shadow-sm mb-2 flex items-center justify-center opacity-90">
                  <div className="w-7 h-4 border border-amber-700/30 rounded-sm" />
                </div>

                <div className="text-base font-bold tracking-tight text-white truncate">
                  {profile.firstName} {profile.lastName}
                </div>
                {(profile.firstNameMalayalam || profile.lastNameMalayalam) && (
                  <div className="text-xs font-malayalam text-amber-300/90 truncate">
                    {profile.firstNameMalayalam} {profile.lastNameMalayalam}
                  </div>
                )}

                <div className="text-[11px] text-blue-200 font-mono tracking-widest mt-1">
                  NO: {profile.admissionNumber}
                </div>
              </div>
            </div>

            {/* Bottom Row: Course, Batch, Blood Group */}
            <div className="flex items-end justify-between border-t border-white/10 pt-2 relative z-10 text-[11px]">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Course & Batch
                </span>
                <span className="font-bold text-white tracking-wide">
                  {profile.courseAdmitted || 'Admitted Course'} • {profile.timePeriodOfStudy}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                    Blood
                  </span>
                  <span className="font-extrabold text-rose-400">{profile.bloodGroup}</span>
                </div>
                {profile.isEws && (
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                      Quota
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-bold text-[10px]">
                      EWS
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BACK OF ID CARD */}
          <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rotate-y-180 backface-hidden overflow-hidden border border-white/15 flex flex-col justify-between shadow-2xl">
            {/* Magnetic Stripe */}
            <div className="absolute top-4 left-0 right-0 h-9 bg-slate-900 border-y border-white/10 shadow-inner" />

            <div className="mt-11 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Campus Access QR</p>
                <p className="text-[9px] text-slate-500 max-w-[200px] mt-0.5">
                  Scan at library, cafeteria, and laboratory checkpoints.
                </p>
              </div>
              <div className="p-1.5 bg-white rounded-lg shadow-md">
                <QRCodeSVG value={qrData} size={65} level="M" />
              </div>
            </div>

            {/* Emergency & Address Preview */}
            <div className="border-t border-white/10 pt-2 text-[10px] text-slate-400">
              <div className="truncate">
                <strong className="text-slate-300">Address:</strong> {profile.address}
              </div>
              <div className="flex justify-between items-center mt-1 text-[9px] text-slate-500">
                <span>Issued by Office of Admissions</span>
                <span className="font-mono text-slate-400">UID: {profile.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
        <RotateCw className="w-3.5 h-3.5" /> Tap card to flip and view campus QR code
      </p>
    </div>
  );
};
