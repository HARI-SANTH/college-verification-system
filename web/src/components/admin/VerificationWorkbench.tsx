import React from 'react';
import { StudentProfile } from '../../types';
import { VerificationQueueDesk } from './VerificationQueueDesk';
import { SideBySideInspector } from './SideBySideInspector';

interface Props {
  students: StudentProfile[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string | null) => void;
  onBackToDashboard: () => void;
  onStudentUpdated: () => void;
}

export const VerificationWorkbench: React.FC<Props> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onStudentUpdated,
}) => {
  // Find selected student if ID is passed
  const selectedStudent = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId)
    : null;

  // Real remaining active candidates in verification flow
  const remainingCount = students.filter(
    (s) => s.verificationStatus === 'SUBMITTED' || s.verificationStatus === 'CORRECTION_REQUIRED'
  ).length;

  if (selectedStudent) {
    // Screen 2: Side-by-Side Auto-Docking Verification Workbench
    return (
      <SideBySideInspector
        student={selectedStudent}
        remainingCount={remainingCount}
        onBackToQueue={() => onSelectStudent(null)}
        onStudentUpdated={onStudentUpdated}
      />
    );
  }

  // Screen 1: Admissions Verification Queue & Smart Triage Desk
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <VerificationQueueDesk
        students={students}
        onSelectStudent={(id) => onSelectStudent(id)}
        onRefresh={onStudentUpdated}
      />
    </div>
  );
};

export default VerificationWorkbench;
