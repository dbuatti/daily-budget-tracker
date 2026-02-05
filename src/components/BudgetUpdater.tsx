import React, { useEffect } from 'react';
import { updateUserBudgetByEmail } from '@/lib/updateBudget';
import { Module } from '@/types/budget';

// New budget configuration for daniele.buatti@gmail.com - $450 Weekly Budget
const newModules: Module[] = [
  {
    id: 'A',
    name: 'Daily Essentials',
    categories: [
      {
        id: 'A1',
        name: 'Groceries',
        tokens: [
          { id: 'A1-0', value: 20, spent: false },
          { id: 'A1-1', value: 20, spent: false },
          { id: 'A1-2', value: 30, spent: false },
        ],
        baseValue: 70,
      },
      {
        id: 'A2',
        name: 'Meals Out',
        tokens: [
          { id: 'A2-0', value: 15, spent: false },
          { id: 'A2-1', value: 15, spent: false },
          { id: 'A2-2', value: 15, spent: false },
        ],
        baseValue: 45,
      },
      {
        id: 'A3',
        name: 'Coffee',
        tokens: [
          { id: 'A3-0', value: 5, spent: false },
          { id: 'A3-1', value: 5, spent: false },
          { id: 'A3-2', value: 5, spent: false },
        ],
        baseValue: 15,
      },
      {
        id: 'A4',
        name: 'Drinks / Treats',
        tokens: [
          { id: 'A4-0', value: 5, spent: false },
        ],
        baseValue: 5,
      },
    ],
  },
  {
    id: 'B',
    name: 'Transport & Car',
    categories: [
      {
        id: 'B1',
        name: 'Myki / Public Transport',
        tokens: [
          { id: 'B1-0', value: 10, spent: false },
          { id: 'B1-1', value: 10, spent: false },
        ],
        baseValue: 20,
      },
      {
        id: 'B2',
        name: 'Tolls & Parking',
        tokens: [
          { id: 'B2-0', value: 5, spent: false },
        ],
        baseValue: 5,
      },
    ],
  },
  {
    id: 'C',
    name: 'Home & Misc',
    categories: [
      {
        id: 'C1',
        name: 'Household Items',
        tokens: [
          { id: 'C1-0', value: 5, spent: false },
          { id: 'C1-1', value: 5, spent: false },
          { id: 'C1-2', value: 5, spent: false },
        ],
        baseValue: 15,
      },
      {
        id: 'C2',
        name: 'Misc Expenses',
        tokens: [
          { id: 'C2-0', value: 5, spent: false },
        ],
        baseValue: 5,
      },
    ],
  },
  {
    id: 'D',
    name: 'Health & Wellness',
    categories: [
      {
        id: 'D1',
        name: 'Wellbeing/Yoga',
        tokens: [
          { id: 'D1-0', value: 30, spent: false },
        ],
        baseValue: 30,
      },
      {
        id: 'D2',
        name: 'Medicine/Specialists',
        tokens: [
          { id: 'D2-0', value: 10, spent: false },
          { id: 'D2-1', value: 10, spent: false },
        ],
        baseValue: 20,
      },
    ],
  },
  {
    id: 'E',
    name: 'Professional & Music',
    categories: [
      {
        id: 'E1',
        name: 'Technology/Gear',
        tokens: [
          { id: 'E1-0', value: 10, spent: false },
          { id: 'E1-1', value: 10, spent: false },
          { id: 'E1-2', value: 10, spent: false },
        ],
        baseValue: 30,
      },
      {
        id: 'E2',
        name: 'Gig Prep',
        tokens: [
          { id: 'E2-0', value: 10, spent: false },
        ],
        baseValue: 10,
      },
    ],
  },
  {
    id: 'F',
    name: 'Buffers & Fun',
    categories: [
      {
        id: 'F1',
        name: 'Shopping/Projects',
        tokens: [
          { id: 'F1-0', value: 10, spent: false },
          { id: 'F1-1', value: 10, spent: false },
        ],
        baseValue: 20,
      },
      {
        id: 'F2',
        name: 'Fun & Recreation',
        tokens: [
          { id: 'F2-0', value: 10, spent: false },
        ],
        baseValue: 10,
      },
    ],
  },
];

const BudgetUpdater: React.FC = () => {
  useEffect(() => {
    const targetEmail = 'daniele.buatti@gmail.com';
    const gearFund = 0;
    updateUserBudgetByEmail(targetEmail, newModules, gearFund)
      .then(() => {
        console.log('Budget updated for', targetEmail);
      })
      .catch((err) => {
        console.error('Error updating budget:', err);
      });
  }, []);

  return null;
};

export default BudgetUpdater;