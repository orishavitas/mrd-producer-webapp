/**
 * Tests for MRD Generator State Management
 * Covers all 12-section state fields, actions, reducer logic, and subsections
 */

import {
  MRDState,
  MRDAction,
  MRDSection,
  Gap,
  ConversationMessage,
  mrdReducer,
  createInitialMRDState,
  getCompletionProgress,
  isAllSectionsComplete,
  MRD_SECTION_IDS,
} from '@/app/mrd-generator/lib/mrd-state';

describe('MRD Generator State Management', () => {
  describe('createInitialMRDState', () => {
    it('should create initial state with all 12 sections', () => {
      const state = createInitialMRDState();

      expect(state.sessionId).toMatch(/^mrd-\d+-[a-z0-9]{7}$/);
      expect(state.initialConcept).toBe('');
      expect(state.documentName).toBe('');
      expect(state.activeSectionId).toBeNull();
      expect(state.previewMode).toBe('full');
      expect(state.processingSections).toEqual([]);
      expect(state.chatMessages).toEqual([]);
    });

    it('should initialize all 12 sections as empty', () => {
      const state = createInitialMRDState();

      MRD_SECTION_IDS.forEach((sectionId) => {
        expect(state.sections[sectionId]).toEqual({
          content: '',
          gaps: [],
          hiddenGaps: [],
          isComplete: false,
          isAIProcessing: false,
        });
      });
    });

    it('should generate valid sessionId format', () => {
      const state1 = createInitialMRDState();
      const state2 = createInitialMRDState();

      expect(state1.sessionId).not.toBe(state2.sessionId);
      expect(state1.sessionId).toMatch(/^mrd-\d+-[a-z0-9]{7}$/);
    });
  });

  describe('SET_INITIAL_CONCEPT', () => {
    it('should set initial concept string', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'SET_INITIAL_CONCEPT',
        payload: {
          concept: 'AI-powered kiosk floor stand with 360° rotation',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.initialConcept).toBe(
        'AI-powered kiosk floor stand with 360° rotation'
      );
    });

    it('should preserve other state fields', () => {
      const state = createInitialMRDState();
      state.documentName = 'Test MRD';
      state.activeSectionId = 'purpose_vision';

      const action: MRDAction = {
        type: 'SET_INITIAL_CONCEPT',
        payload: { concept: 'New concept' },
      };

      const newState = mrdReducer(state, action);

      expect(newState.documentName).toBe('Test MRD');
      expect(newState.activeSectionId).toBe('purpose_vision');
    });
  });

  describe('SET_DOCUMENT_NAME', () => {
    it('should update document name', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'SET_DOCUMENT_NAME',
        payload: {
          documentName: 'AI Kiosk MRD 2026-02-16',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.documentName).toBe('AI Kiosk MRD 2026-02-16');
    });

    it('should handle empty string', () => {
      const state = createInitialMRDState();
      state.documentName = 'Existing Name';

      const action: MRDAction = {
        type: 'SET_DOCUMENT_NAME',
        payload: { documentName: '' },
      };

      const newState = mrdReducer(state, action);

      expect(newState.documentName).toBe('');
    });
  });

  describe('SET_SECTION_CONTENT', () => {
    it('should update content for a section', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'SET_SECTION_CONTENT',
        payload: {
          sectionId: 'purpose_vision',
          content: 'This product expands our portfolio of mounting solutions...',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.content).toBe(
        'This product expands our portfolio of mounting solutions...'
      );
    });

    it('should not affect other sections', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'SET_SECTION_CONTENT',
        payload: {
          sectionId: 'purpose_vision',
          content: 'Test content',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.problem_statement?.content).toBe('');
      expect(newState.sections.target_market?.content).toBe('');
    });

    it('should create section if it does not exist', () => {
      const state = createInitialMRDState();
      // @ts-expect-error - Testing edge case
      delete state.sections.purpose_vision;

      const action: MRDAction = {
        type: 'SET_SECTION_CONTENT',
        payload: {
          sectionId: 'purpose_vision',
          content: 'New content',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.content).toBe('New content');
    });
  });

  describe('SET_SUBSECTION_CONTENT', () => {
    it('should set subsection content for target_market section', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'SET_SUBSECTION_CONTENT',
        payload: {
          sectionId: 'target_market',
          subsectionId: 'primary_markets',
          content: '* Retail\n* Healthcare\n* Education',
        },
      };

      const newState = mrdReducer(state, action);

      expect(
        newState.sections.target_market?.subsections?.primary_markets?.content
      ).toBe('* Retail\n* Healthcare\n* Education');
    });

    it('should handle key_requirements subsections', () => {
      const state = createInitialMRDState();

      let newState = mrdReducer(state, {
        type: 'SET_SUBSECTION_CONTENT',
        payload: {
          sectionId: 'key_requirements',
          subsectionId: 'functional_requirements',
          content: '* VESA mount support\n* Cable management',
        },
      });

      newState = mrdReducer(newState, {
        type: 'SET_SUBSECTION_CONTENT',
        payload: {
          sectionId: 'key_requirements',
          subsectionId: 'category_requirements_2',
          content: '* Height: 48-60 inches\n* Base diameter: 24 inches',
        },
      });

      expect(
        newState.sections.key_requirements?.subsections?.functional_requirements
          ?.content
      ).toBe('* VESA mount support\n* Cable management');
      expect(
        newState.sections.key_requirements?.subsections?.category_requirements_2
          ?.content
      ).toBe('* Height: 48-60 inches\n* Base diameter: 24 inches');
    });

    it('should preserve main section content', () => {
      const state = createInitialMRDState();
      state.sections.target_market!.content = 'Main section intro';

      const action: MRDAction = {
        type: 'SET_SUBSECTION_CONTENT',
        payload: {
          sectionId: 'target_market',
          subsectionId: 'primary_markets',
          content: '* Retail',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.target_market?.content).toBe('Main section intro');
    });

    it('should handle missing subsections object', () => {
      const state = createInitialMRDState();
      // @ts-expect-error - Testing edge case
      delete state.sections.target_market!.subsections;

      const action: MRDAction = {
        type: 'SET_SUBSECTION_CONTENT',
        payload: {
          sectionId: 'target_market',
          subsectionId: 'primary_markets',
          content: '* Retail',
        },
      };

      const newState = mrdReducer(state, action);

      expect(
        newState.sections.target_market?.subsections?.primary_markets?.content
      ).toBe('* Retail');
    });
  });

  describe('SET_SECTION_GAPS', () => {
    it('should update gaps for a section', () => {
      const state = createInitialMRDState();
      const gaps: Gap[] = [
        {
          id: 'gap-1',
          category: 'Strategic Context',
          description: 'Missing portfolio positioning',
          priority: 'medium',
          suggestedQuestion: 'How does this fit into your product portfolio?',
        },
      ];

      const action: MRDAction = {
        type: 'SET_SECTION_GAPS',
        payload: {
          sectionId: 'purpose_vision',
          gaps,
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.gaps).toEqual(gaps);
    });

    it('should preserve content when updating gaps', () => {
      const state = createInitialMRDState();
      state.sections.purpose_vision!.content = 'Existing content';

      const action: MRDAction = {
        type: 'SET_SECTION_GAPS',
        payload: {
          sectionId: 'purpose_vision',
          gaps: [],
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.content).toBe('Existing content');
    });
  });

  describe('SET_ACTIVE_SECTION', () => {
    it('should set active section ID', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'SET_ACTIVE_SECTION',
        payload: {
          sectionId: 'purpose_vision',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.activeSectionId).toBe('purpose_vision');
    });

    it('should clear active section when set to null', () => {
      const state = createInitialMRDState();
      state.activeSectionId = 'purpose_vision';

      const action: MRDAction = {
        type: 'SET_ACTIVE_SECTION',
        payload: {
          sectionId: null,
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.activeSectionId).toBeNull();
    });
  });

  describe('SET_CHAT_MESSAGES', () => {
    it('should replace entire chat history', () => {
      const state = createInitialMRDState();
      const messages: ConversationMessage[] = [
        {
          role: 'user',
          content: 'What features should I add?',
          timestamp: Date.now(),
        },
        {
          role: 'assistant',
          content: 'Consider VESA compatibility...',
          timestamp: Date.now() + 1000,
        },
      ];

      const action: MRDAction = {
        type: 'SET_CHAT_MESSAGES',
        payload: { messages },
      };

      const newState = mrdReducer(state, action);

      expect(newState.chatMessages).toEqual(messages);
    });

    it('should handle empty array', () => {
      const state = createInitialMRDState();
      state.chatMessages = [
        { role: 'user', content: 'Test', timestamp: Date.now() },
      ];

      const action: MRDAction = {
        type: 'SET_CHAT_MESSAGES',
        payload: { messages: [] },
      };

      const newState = mrdReducer(state, action);

      expect(newState.chatMessages).toEqual([]);
    });
  });

  describe('APPEND_CHAT_MESSAGE', () => {
    it('should append message to chatMessages', () => {
      const state = createInitialMRDState();
      const message: ConversationMessage = {
        role: 'user',
        content: 'Tell me more about pricing',
        timestamp: Date.now(),
      };

      const action: MRDAction = {
        type: 'APPEND_CHAT_MESSAGE',
        payload: { message },
      };

      const newState = mrdReducer(state, action);

      expect(newState.chatMessages).toHaveLength(1);
      expect(newState.chatMessages[0]).toEqual(message);
    });

    it('should preserve order when appending', () => {
      const state = createInitialMRDState();
      state.chatMessages = [
        { role: 'user', content: 'First', timestamp: 1000 },
        { role: 'assistant', content: 'Second', timestamp: 2000 },
      ];

      const action: MRDAction = {
        type: 'APPEND_CHAT_MESSAGE',
        payload: {
          message: { role: 'user', content: 'Third', timestamp: 3000 },
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.chatMessages).toHaveLength(3);
      expect(newState.chatMessages[2].content).toBe('Third');
    });

    it('should handle ConversationMessage structure with suggestedContent', () => {
      const state = createInitialMRDState();
      const message: ConversationMessage = {
        role: 'assistant',
        content: 'Here is a suggestion...',
        suggestedContent: '* Feature A\n* Feature B',
        isFinalSuggestion: true,
        timestamp: Date.now(),
      };

      const action: MRDAction = {
        type: 'APPEND_CHAT_MESSAGE',
        payload: { message },
      };

      const newState = mrdReducer(state, action);

      expect(newState.chatMessages[0].suggestedContent).toBe(
        '* Feature A\n* Feature B'
      );
      expect(newState.chatMessages[0].isFinalSuggestion).toBe(true);
    });
  });

  describe('SET_PROCESSING_SECTIONS', () => {
    it('should set processing section IDs', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'SET_PROCESSING_SECTIONS',
        payload: {
          sectionIds: ['purpose_vision', 'problem_statement', 'target_market'],
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.processingSections).toEqual([
        'purpose_vision',
        'problem_statement',
        'target_market',
      ]);
    });

    it('should clear processing sections', () => {
      const state = createInitialMRDState();
      state.processingSections = ['purpose_vision', 'problem_statement'];

      const action: MRDAction = {
        type: 'SET_PROCESSING_SECTIONS',
        payload: {
          sectionIds: [],
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.processingSections).toEqual([]);
    });
  });

  describe('SET_PREVIEW_MODE', () => {
    it('should switch to completed preview mode', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'SET_PREVIEW_MODE',
        payload: {
          mode: 'completed',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.previewMode).toBe('completed');
    });

    it('should switch to full preview mode', () => {
      const state = createInitialMRDState();
      state.previewMode = 'completed';

      const action: MRDAction = {
        type: 'SET_PREVIEW_MODE',
        payload: {
          mode: 'full',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.previewMode).toBe('full');
    });
  });

  describe('MARK_SECTION_COMPLETE', () => {
    it('should mark section as complete', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'MARK_SECTION_COMPLETE',
        payload: {
          sectionId: 'purpose_vision',
          isComplete: true,
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.isComplete).toBe(true);
    });

    it('should mark section as incomplete', () => {
      const state = createInitialMRDState();
      state.sections.purpose_vision!.isComplete = true;

      const action: MRDAction = {
        type: 'MARK_SECTION_COMPLETE',
        payload: {
          sectionId: 'purpose_vision',
          isComplete: false,
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.isComplete).toBe(false);
    });
  });

  describe('HIDE_GAP', () => {
    it('should hide gap by ID', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'HIDE_GAP',
        payload: {
          sectionId: 'purpose_vision',
          gapId: 'gap-1',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.hiddenGaps).toContain('gap-1');
    });

    it('should not duplicate if gap already hidden', () => {
      const state = createInitialMRDState();
      state.sections.purpose_vision!.hiddenGaps = ['gap-1'];

      const action: MRDAction = {
        type: 'HIDE_GAP',
        payload: {
          sectionId: 'purpose_vision',
          gapId: 'gap-1',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.hiddenGaps).toEqual(['gap-1']);
      expect(newState.sections.purpose_vision?.hiddenGaps.length).toBe(1);
    });

    it('should hide multiple gaps for same section', () => {
      const state = createInitialMRDState();

      let newState = mrdReducer(state, {
        type: 'HIDE_GAP',
        payload: { sectionId: 'purpose_vision', gapId: 'gap-1' },
      });

      newState = mrdReducer(newState, {
        type: 'HIDE_GAP',
        payload: { sectionId: 'purpose_vision', gapId: 'gap-2' },
      });

      expect(newState.sections.purpose_vision?.hiddenGaps).toEqual([
        'gap-1',
        'gap-2',
      ]);
    });

    it('should only affect specified section', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'HIDE_GAP',
        payload: {
          sectionId: 'purpose_vision',
          gapId: 'gap-1',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.hiddenGaps).toContain('gap-1');
      expect(newState.sections.problem_statement?.hiddenGaps).toEqual([]);
    });
  });

  describe('BATCH_POPULATE_SECTIONS', () => {
    it('should populate multiple sections from batch extraction', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: {
            purpose_vision: {
              content: 'This product expands our portfolio...',
            },
            problem_statement: {
              content: 'Current solutions lack flexibility...',
            },
          },
          gaps: {
            purpose_vision: [],
            problem_statement: [
              {
                id: 'gap-prob-1',
                category: 'Market Gap',
                description: 'Missing specific pain point details',
                priority: 'high',
                suggestedQuestion: 'What specific problem does this solve?',
              },
            ],
          },
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.content).toBe(
        'This product expands our portfolio...'
      );
      expect(newState.sections.purpose_vision?.gaps).toEqual([]);
      expect(newState.sections.purpose_vision?.isAIProcessing).toBe(false);

      expect(newState.sections.problem_statement?.content).toBe(
        'Current solutions lack flexibility...'
      );
      expect(newState.sections.problem_statement?.gaps).toHaveLength(1);
      expect(newState.sections.problem_statement?.gaps[0].id).toBe('gap-prob-1');
    });

    it('should clear processing sections after batch populate', () => {
      const state = createInitialMRDState();
      state.processingSections = [
        'purpose_vision',
        'problem_statement',
        'target_market',
      ];

      const action: MRDAction = {
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: {
            purpose_vision: {
              content: 'Test content',
            },
          },
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.processingSections).toEqual([]);
    });

    it('should update document name if provided', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: {
            purpose_vision: {
              content: 'Test',
            },
          },
          documentName: 'AI Kiosk MRD 2026-02-16',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.documentName).toBe('AI Kiosk MRD 2026-02-16');
    });

    it('should preserve existing sections not in payload', () => {
      const state = createInitialMRDState();
      state.sections.target_users!.content = 'Existing user content';
      state.sections.target_users!.isComplete = true;

      const action: MRDAction = {
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: {
            purpose_vision: {
              content: 'New purpose content',
            },
          },
        },
      };

      const newState = mrdReducer(state, action);

      // Purpose vision updated
      expect(newState.sections.purpose_vision?.content).toBe(
        'New purpose content'
      );

      // Target users preserved
      expect(newState.sections.target_users?.content).toBe(
        'Existing user content'
      );
      expect(newState.sections.target_users?.isComplete).toBe(true);
    });

    it('should populate sections with subsections', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: {
            purpose_vision: {
              content: 'Portfolio expansion...',
            },
            target_market: {
              content: '',
              subsections: {
                primary_markets: { content: '* Retail\n* Healthcare' },
                core_use_cases: { content: '* POS systems\n* Wayfinding' },
              },
            },
          },
          documentName: 'AI Kiosk Floor Stand MRD 2026-02-16',
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.purpose_vision?.content).toBe(
        'Portfolio expansion...'
      );
      expect(
        newState.sections.target_market?.subsections?.primary_markets?.content
      ).toBe('* Retail\n* Healthcare');
      expect(
        newState.sections.target_market?.subsections?.core_use_cases?.content
      ).toBe('* POS systems\n* Wayfinding');
      expect(newState.documentName).toBe('AI Kiosk Floor Stand MRD 2026-02-16');
    });

    it('should handle key_requirements with multiple subsections', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: {
            key_requirements: {
              content: 'Overview of requirements...',
              subsections: {
                functional_requirements: {
                  content: '* VESA compatibility\n* Cable management',
                },
                category_requirements_2: {
                  content: '* Height: 48-60 inches\n* Base: 24 inches',
                },
              },
            },
          },
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.key_requirements?.content).toBe(
        'Overview of requirements...'
      );
      expect(
        newState.sections.key_requirements?.subsections?.functional_requirements
          ?.content
      ).toBe('* VESA compatibility\n* Cable management');
      expect(
        newState.sections.key_requirements?.subsections?.category_requirements_2
          ?.content
      ).toBe('* Height: 48-60 inches\n* Base: 24 inches');
    });
  });

  describe('Helper Functions', () => {
    describe('getCompletionProgress', () => {
      it('should return 0 for initial state', () => {
        const state = createInitialMRDState();
        expect(getCompletionProgress(state)).toBe(0);
      });

      it('should count completed sections', () => {
        const state = createInitialMRDState();
        state.sections.purpose_vision!.isComplete = true;
        state.sections.problem_statement!.isComplete = true;
        state.sections.target_market!.isComplete = true;

        expect(getCompletionProgress(state)).toBe(3);
      });

      it('should return 12 when all sections complete', () => {
        const state = createInitialMRDState();
        MRD_SECTION_IDS.forEach((sectionId) => {
          state.sections[sectionId]!.isComplete = true;
        });

        expect(getCompletionProgress(state)).toBe(12);
      });

      it('should handle partial completion', () => {
        const state = createInitialMRDState();
        state.sections.purpose_vision!.isComplete = true;
        state.sections.problem_statement!.isComplete = false;
        state.sections.target_market!.isComplete = true;
        state.sections.target_users!.isComplete = false;
        state.sections.product_description!.isComplete = true;

        expect(getCompletionProgress(state)).toBe(3);
      });
    });

    describe('isAllSectionsComplete', () => {
      it('should return false for initial state', () => {
        const state = createInitialMRDState();
        expect(isAllSectionsComplete(state)).toBe(false);
      });

      it('should return false if some sections incomplete', () => {
        const state = createInitialMRDState();
        state.sections.purpose_vision!.isComplete = true;
        state.sections.problem_statement!.isComplete = true;
        // Other 10 sections remain incomplete

        expect(isAllSectionsComplete(state)).toBe(false);
      });

      it('should return true when all 12 sections complete', () => {
        const state = createInitialMRDState();
        MRD_SECTION_IDS.forEach((sectionId) => {
          state.sections[sectionId]!.isComplete = true;
        });

        expect(isAllSectionsComplete(state)).toBe(true);
      });

      it('should return false if exactly 11 sections complete', () => {
        const state = createInitialMRDState();
        MRD_SECTION_IDS.forEach((sectionId) => {
          state.sections[sectionId]!.isComplete = true;
        });
        // Mark last section incomplete
        state.sections.success_criteria!.isComplete = false;

        expect(isAllSectionsComplete(state)).toBe(false);
      });
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original state', () => {
      const state = createInitialMRDState();
      const originalState = JSON.parse(JSON.stringify(state));

      mrdReducer(state, {
        type: 'SET_SECTION_CONTENT',
        payload: { sectionId: 'purpose_vision', content: 'Test' },
      });

      expect(state).toEqual(originalState);
    });

    it('should create new object references', () => {
      const state = createInitialMRDState();
      const newState = mrdReducer(state, {
        type: 'SET_SECTION_CONTENT',
        payload: { sectionId: 'purpose_vision', content: 'Test' },
      });

      expect(newState).not.toBe(state);
      expect(newState.sections).not.toBe(state.sections);
      expect(newState.sections.purpose_vision).not.toBe(
        state.sections.purpose_vision
      );
    });

    it('should not mutate sections object when updating subsection', () => {
      const state = createInitialMRDState();
      const originalSections = state.sections;

      const newState = mrdReducer(state, {
        type: 'SET_SUBSECTION_CONTENT',
        payload: {
          sectionId: 'target_market',
          subsectionId: 'primary_markets',
          content: '* Retail',
        },
      });

      expect(newState.sections).not.toBe(originalSections);
      expect(newState.sections.target_market).not.toBe(
        originalSections.target_market
      );
    });

    it('should not mutate chat messages when appending', () => {
      const state = createInitialMRDState();
      state.chatMessages = [
        { role: 'user', content: 'Test', timestamp: 1000 },
      ];
      const originalMessages = state.chatMessages;

      const newState = mrdReducer(state, {
        type: 'APPEND_CHAT_MESSAGE',
        payload: {
          message: { role: 'assistant', content: 'Reply', timestamp: 2000 },
        },
      });

      expect(newState.chatMessages).not.toBe(originalMessages);
      expect(originalMessages).toHaveLength(1); // Original unchanged
      expect(newState.chatMessages).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown action type gracefully', () => {
      const state = createInitialMRDState();
      const action = { type: 'UNKNOWN_ACTION' } as any;

      const newState = mrdReducer(state, action);

      expect(newState).toEqual(state);
    });

    it('should handle missing subsection data in batch populate', () => {
      const state = createInitialMRDState();
      const action: MRDAction = {
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: {
            target_market: {
              content: 'Market overview',
              // No subsections provided
            },
          },
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.target_market?.content).toBe('Market overview');
      // Subsections should not be affected
      expect(newState.sections.target_market?.subsections).toBeUndefined();
    });

    it('should preserve subsections when batch populating without subsection data', () => {
      const state = createInitialMRDState();
      state.sections.target_market!.subsections = {
        primary_markets: {
          content: 'Existing markets',
          gaps: [],
          hiddenGaps: [],
          isComplete: false,
        },
      };

      const action: MRDAction = {
        type: 'BATCH_POPULATE_SECTIONS',
        payload: {
          sections: {
            target_market: {
              content: 'Updated market overview',
              // No subsections in payload
            },
          },
        },
      };

      const newState = mrdReducer(state, action);

      expect(newState.sections.target_market?.content).toBe(
        'Updated market overview'
      );
      // Existing subsections preserved
      expect(
        newState.sections.target_market?.subsections?.primary_markets?.content
      ).toBe('Existing markets');
    });

    it('should handle chat messages with missing optional fields', () => {
      const state = createInitialMRDState();
      const message: ConversationMessage = {
        role: 'user',
        content: 'Simple message',
        timestamp: Date.now(),
        // No suggestedContent or isFinalSuggestion
      };

      const action: MRDAction = {
        type: 'APPEND_CHAT_MESSAGE',
        payload: { message },
      };

      const newState = mrdReducer(state, action);

      expect(newState.chatMessages[0].suggestedContent).toBeUndefined();
      expect(newState.chatMessages[0].isFinalSuggestion).toBeUndefined();
    });
  });
});
