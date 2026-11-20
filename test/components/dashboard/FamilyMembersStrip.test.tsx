import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FamilyMembersStrip from '../../../src/components/dashboard/FamilyMembersStrip';
import { MemberBreakdown } from '../../../src/types/finance';

describe('FamilyMembersStrip', () => {
  it('shows Privado badges for hidden member fields and opens privacy settings', () => {
    const onOpenPrivacy = jest.fn();
    const members: MemberBreakdown[] = [
      {
        userId: 'u-self',
        name: 'Igor',
        maskedCpf: '***.456.789-**',
        isSelf: true,
        balance: 1000,
        totalIncome: 3000,
        scheduledIncome: 0,
        totalExpenses: 500,
        emergencyFund: 0,
        investments: 2000,
      },
      {
        userId: 'u-other',
        name: 'Maria',
        maskedCpf: '***.111.222-**',
        isSelf: false,
        permissions: {
          viewBalance: false,
          viewIncome: false,
          viewExpenses: true,
          viewInvestments: false,
          viewEmergencyFund: true,
          viewFoodAllowance: true,
        },
        balance: 0,
        totalIncome: 0,
        scheduledIncome: 0,
        totalExpenses: 400,
        emergencyFund: 500,
        investments: 0,
        foodAllowance: 300,
      },
    ];

    render(
      <FamilyMembersStrip
        members={members}
        selectedMemberId="all"
        onSelectMember={jest.fn()}
        onOpenPrivacySettings={onOpenPrivacy}
      />,
    );

    expect(screen.getAllByText('Privado').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByText(/Permissões/));
    expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
  });
});
