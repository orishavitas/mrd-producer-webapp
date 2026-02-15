/**
 * Tests for Brief Helper State Management
 * Covers all V2 state fields, actions, and reducer logic
 */

import {
  BriefState,
  BriefAction,
  BriefField,
  Gap,
  FieldState,
  briefReducer,
  createInitialState,
  getCompletionProgress,
  isAllFieldsComplete,
} from '@/app/brief-helper/lib/brief-state';

describe('Brief Helper State Management', () => {
  describe('createInitialState', () => {
    it('should create initial state with all V2 fields', () => {
      const state = createInitialState();

      expect(state.sessionId).toMatch(/^brief-\d+-[a-z0-9]{7}$/);
      expect(state.startTime).toBeGreaterThan(0);
      expect(state.lastUpdated).toBeGreaterThan(0);
      expect(state.initialDescription).toBe('');
      expect(state.activeFieldId).toBeNull();
      expect(state.previewMode).toBe('suggestions');
      expect(state.processingFields).toEqual([]);
      expect(state.collapsedFields).toEqual([]);
    });

    it('should initialize all 6 fields as empty', () => {
      const state = createInitialState();
      const fields: BriefField[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];

      fields.forEach((field) => {
        expect(state.fields[field]).toEqual({
          rawText: '',
          bulletPoints: [],
          gaps: [],
          hiddenGaps: [],
          isAIProcessing: false,
          isComplete: false,
        });
      });
    });
  });

  describe('SET_RAW_TEXT', () => {
    it('should update raw text for a field', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'SET_RAW_TEXT',
        payload: {
          fieldType: 'what',
          rawText: 'iPad stand for retail',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.rawText).toBe('iPad stand for retail');
      expect(newState.lastUpdated).toBeGreaterThanOrEqual(state.lastUpdated);
    });

    it('should not affect other fields', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'SET_RAW_TEXT',
        payload: {
          fieldType: 'what',
          rawText: 'Test text',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.who.rawText).toBe('');
      expect(newState.fields.where.rawText).toBe('');
    });
  });

  describe('SET_BULLET_POINTS', () => {
    it('should update bullet points for a field', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'SET_BULLET_POINTS',
        payload: {
          fieldType: 'what',
          bulletPoints: ['iPad stand', 'Retail environment'],
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.bulletPoints).toEqual(['iPad stand', 'Retail environment']);
    });
  });

  describe('SET_GAPS', () => {
    it('should update gaps for a field', () => {
      const state = createInitialState();
      const gaps: Gap[] = [
        {
          id: 'gap-1',
          category: 'product',
          description: 'Missing rotation details',
          priority: 'high',
          suggestedQuestion: 'Does the stand rotate?',
        },
      ];

      const action: BriefAction = {
        type: 'SET_GAPS',
        payload: {
          fieldType: 'what',
          gaps,
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.gaps).toEqual(gaps);
    });
  });

  describe('SET_AI_PROCESSING', () => {
    it('should set AI processing flag to true', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'SET_AI_PROCESSING',
        payload: {
          fieldType: 'what',
          isProcessing: true,
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.isAIProcessing).toBe(true);
    });

    it('should set AI processing flag to false', () => {
      const state = createInitialState();
      state.fields.what.isAIProcessing = true;

      const action: BriefAction = {
        type: 'SET_AI_PROCESSING',
        payload: {
          fieldType: 'what',
          isProcessing: false,
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.isAIProcessing).toBe(false);
    });
  });

  describe('MARK_COMPLETE', () => {
    it('should mark field as complete', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'MARK_COMPLETE',
        payload: {
          fieldType: 'what',
          isComplete: true,
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.isComplete).toBe(true);
    });

    it('should mark field as incomplete', () => {
      const state = createInitialState();
      state.fields.what.isComplete = true;

      const action: BriefAction = {
        type: 'MARK_COMPLETE',
        payload: {
          fieldType: 'what',
          isComplete: false,
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.isComplete).toBe(false);
    });
  });

  describe('RESET_FIELD', () => {
    it('should reset field to empty state', () => {
      const state = createInitialState();
      state.fields.what.rawText = 'Test';
      state.fields.what.bulletPoints = ['bullet 1'];
      state.fields.what.gaps = [
        {
          id: 'gap-1',
          category: 'test',
          description: 'Test gap',
          priority: 'low',
          suggestedQuestion: 'What?',
        },
      ];
      state.fields.what.isComplete = true;

      const action: BriefAction = {
        type: 'RESET_FIELD',
        payload: {
          fieldType: 'what',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what).toEqual({
        rawText: '',
        bulletPoints: [],
        gaps: [],
        hiddenGaps: [],
        isAIProcessing: false,
        isComplete: false,
      });
    });
  });

  describe('SET_INITIAL_DESCRIPTION (V2)', () => {
    it('should set initial description', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'SET_INITIAL_DESCRIPTION',
        payload: {
          description: 'iPad Pro stand for retail stores with 360° rotation',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.initialDescription).toBe(
        'iPad Pro stand for retail stores with 360° rotation'
      );
    });
  });

  describe('SET_ACTIVE_FIELD (V2)', () => {
    it('should set active field', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'SET_ACTIVE_FIELD',
        payload: {
          fieldId: 'what',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.activeFieldId).toBe('what');
    });

    it('should clear active field when set to null', () => {
      const state = createInitialState();
      state.activeFieldId = 'what';

      const action: BriefAction = {
        type: 'SET_ACTIVE_FIELD',
        payload: {
          fieldId: null,
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.activeFieldId).toBeNull();
    });
  });

  describe('SET_PREVIEW_MODE (V2)', () => {
    it('should switch to document preview mode', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'SET_PREVIEW_MODE',
        payload: {
          mode: 'document',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.previewMode).toBe('document');
    });

    it('should switch to suggestions mode', () => {
      const state = createInitialState();
      state.previewMode = 'document';

      const action: BriefAction = {
        type: 'SET_PREVIEW_MODE',
        payload: {
          mode: 'suggestions',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.previewMode).toBe('suggestions');
    });
  });

  describe('SET_PROCESSING_FIELDS (V2)', () => {
    it('should set processing fields', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'SET_PROCESSING_FIELDS',
        payload: {
          fields: ['what', 'who', 'where'],
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.processingFields).toEqual(['what', 'who', 'where']);
    });

    it('should clear processing fields', () => {
      const state = createInitialState();
      state.processingFields = ['what', 'who'];

      const action: BriefAction = {
        type: 'SET_PROCESSING_FIELDS',
        payload: {
          fields: [],
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.processingFields).toEqual([]);
    });
  });

  describe('COLLAPSE_FIELD (V2)', () => {
    it('should collapse a field', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'COLLAPSE_FIELD',
        payload: {
          fieldType: 'what',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.collapsedFields).toContain('what');
    });

    it('should not duplicate if already collapsed', () => {
      const state = createInitialState();
      state.collapsedFields = ['what'];

      const action: BriefAction = {
        type: 'COLLAPSE_FIELD',
        payload: {
          fieldType: 'what',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.collapsedFields).toEqual(['what']);
      expect(newState.collapsedFields.length).toBe(1);
    });

    it('should collapse multiple fields', () => {
      const state = createInitialState();

      let newState = briefReducer(state, {
        type: 'COLLAPSE_FIELD',
        payload: { fieldType: 'what' },
      });

      newState = briefReducer(newState, {
        type: 'COLLAPSE_FIELD',
        payload: { fieldType: 'who' },
      });

      expect(newState.collapsedFields).toEqual(['what', 'who']);
    });
  });

  describe('EXPAND_FIELD (V2)', () => {
    it('should expand a collapsed field', () => {
      const state = createInitialState();
      state.collapsedFields = ['what', 'who', 'where'];

      const action: BriefAction = {
        type: 'EXPAND_FIELD',
        payload: {
          fieldType: 'who',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.collapsedFields).toEqual(['what', 'where']);
      expect(newState.collapsedFields).not.toContain('who');
    });

    it('should handle expanding non-collapsed field gracefully', () => {
      const state = createInitialState();
      state.collapsedFields = ['what'];

      const action: BriefAction = {
        type: 'EXPAND_FIELD',
        payload: {
          fieldType: 'who',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.collapsedFields).toEqual(['what']);
    });
  });

  describe('HIDE_GAP (V2)', () => {
    it('should hide a gap by ID', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'HIDE_GAP',
        payload: {
          fieldType: 'what',
          gapId: 'gap-1',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.hiddenGaps).toContain('gap-1');
    });

    it('should not duplicate if gap already hidden', () => {
      const state = createInitialState();
      state.fields.what.hiddenGaps = ['gap-1'];

      const action: BriefAction = {
        type: 'HIDE_GAP',
        payload: {
          fieldType: 'what',
          gapId: 'gap-1',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.hiddenGaps).toEqual(['gap-1']);
      expect(newState.fields.what.hiddenGaps.length).toBe(1);
    });

    it('should hide multiple gaps for same field', () => {
      const state = createInitialState();

      let newState = briefReducer(state, {
        type: 'HIDE_GAP',
        payload: { fieldType: 'what', gapId: 'gap-1' },
      });

      newState = briefReducer(newState, {
        type: 'HIDE_GAP',
        payload: { fieldType: 'what', gapId: 'gap-2' },
      });

      expect(newState.fields.what.hiddenGaps).toEqual(['gap-1', 'gap-2']);
    });

    it('should only affect specified field', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'HIDE_GAP',
        payload: {
          fieldType: 'what',
          gapId: 'gap-1',
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.hiddenGaps).toContain('gap-1');
      expect(newState.fields.who.hiddenGaps).toEqual([]);
    });
  });

  describe('BATCH_POPULATE_FIELDS (V2)', () => {
    it('should populate multiple fields from batch extraction', () => {
      const state = createInitialState();
      const action: BriefAction = {
        type: 'BATCH_POPULATE_FIELDS',
        payload: {
          fields: {
            what: {
              bulletPoints: ['iPad stand', 'Retail use'],
              gaps: [],
            },
            who: {
              bulletPoints: ['Store managers', 'Sales staff'],
              gaps: [
                {
                  id: 'gap-who-1',
                  category: 'users',
                  description: 'Missing role details',
                  priority: 'medium',
                  suggestedQuestion: 'What are their specific roles?',
                },
              ],
            },
          },
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.fields.what.bulletPoints).toEqual(['iPad stand', 'Retail use']);
      expect(newState.fields.what.gaps).toEqual([]);
      expect(newState.fields.what.isAIProcessing).toBe(false);

      expect(newState.fields.who.bulletPoints).toEqual(['Store managers', 'Sales staff']);
      expect(newState.fields.who.gaps).toHaveLength(1);
      expect(newState.fields.who.gaps[0].id).toBe('gap-who-1');
    });

    it('should clear processing fields after batch populate', () => {
      const state = createInitialState();
      state.processingFields = ['what', 'who', 'where'];

      const action: BriefAction = {
        type: 'BATCH_POPULATE_FIELDS',
        payload: {
          fields: {
            what: {
              bulletPoints: ['Test'],
              gaps: [],
            },
          },
        },
      };

      const newState = briefReducer(state, action);

      expect(newState.processingFields).toEqual([]);
    });

    it('should preserve existing field data for unpopulated fields', () => {
      const state = createInitialState();
      state.fields.where.rawText = 'Existing text';
      state.fields.where.bulletPoints = ['Existing bullet'];

      const action: BriefAction = {
        type: 'BATCH_POPULATE_FIELDS',
        payload: {
          fields: {
            what: {
              bulletPoints: ['New bullet'],
              gaps: [],
            },
          },
        },
      };

      const newState = briefReducer(state, action);

      // What field updated
      expect(newState.fields.what.bulletPoints).toEqual(['New bullet']);

      // Where field preserved
      expect(newState.fields.where.rawText).toBe('Existing text');
      expect(newState.fields.where.bulletPoints).toEqual(['Existing bullet']);
    });
  });

  describe('Helper Functions', () => {
    describe('getCompletionProgress', () => {
      it('should return 0 for initial state', () => {
        const state = createInitialState();
        expect(getCompletionProgress(state)).toBe(0);
      });

      it('should count completed fields', () => {
        const state = createInitialState();
        state.fields.what.isComplete = true;
        state.fields.who.isComplete = true;

        expect(getCompletionProgress(state)).toBe(2);
      });

      it('should return 6 when all fields complete', () => {
        const state = createInitialState();
        const fields: BriefField[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];
        fields.forEach((field) => {
          state.fields[field].isComplete = true;
        });

        expect(getCompletionProgress(state)).toBe(6);
      });
    });

    describe('isAllFieldsComplete', () => {
      it('should return false for initial state', () => {
        const state = createInitialState();
        expect(isAllFieldsComplete(state)).toBe(false);
      });

      it('should return false if some fields incomplete', () => {
        const state = createInitialState();
        state.fields.what.isComplete = true;
        state.fields.who.isComplete = true;

        expect(isAllFieldsComplete(state)).toBe(false);
      });

      it('should return true when all 6 fields complete', () => {
        const state = createInitialState();
        const fields: BriefField[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];
        fields.forEach((field) => {
          state.fields[field].isComplete = true;
        });

        expect(isAllFieldsComplete(state)).toBe(true);
      });
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original state', () => {
      const state = createInitialState();
      const originalState = JSON.parse(JSON.stringify(state));

      briefReducer(state, {
        type: 'SET_RAW_TEXT',
        payload: { fieldType: 'what', rawText: 'Test' },
      });

      expect(state).toEqual(originalState);
    });

    it('should create new object references', () => {
      const state = createInitialState();
      const newState = briefReducer(state, {
        type: 'SET_RAW_TEXT',
        payload: { fieldType: 'what', rawText: 'Test' },
      });

      expect(newState).not.toBe(state);
      expect(newState.fields).not.toBe(state.fields);
      expect(newState.fields.what).not.toBe(state.fields.what);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown action type gracefully', () => {
      const state = createInitialState();
      const action = { type: 'UNKNOWN_ACTION' } as any;

      const newState = briefReducer(state, action);

      expect(newState).toEqual(state);
    });

    it('should update lastUpdated for all actions except default', () => {
      const state = createInitialState();
      const originalTimestamp = state.lastUpdated;

      // Wait 1ms to ensure timestamp difference
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      return sleep(1).then(() => {
        const newState = briefReducer(state, {
          type: 'SET_RAW_TEXT',
          payload: { fieldType: 'what', rawText: 'Test' },
        });

        expect(newState.lastUpdated).toBeGreaterThan(originalTimestamp);
      });
    });
  });
});
