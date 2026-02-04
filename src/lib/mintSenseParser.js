// Advanced MintSense AI Parser - 100% Client-Side, No API Keys Required

export class MintSenseParser {
    constructor(participants) {
        this.participants = participants;
    }

    // Main parsing function
    parse(input) {
        const text = input.trim();

        // Try different patterns in order of complexity
        const patterns = [
            this.parseStandardPaid.bind(this),      // "Alice paid 500 for Dinner"
            this.parseSplitPattern.bind(this),      // "Split 600 for Lunch"
            this.parseAmongPattern.bind(this),      // "500 for Dinner split among Alice, Bob"
            this.parseSharedPattern.bind(this),     // "Alice and Bob shared 800 for Movie"
            this.parseBoughtPattern.bind(this),     // "Alice bought Groceries for 1200"
            this.parseSpentPattern.bind(this),      // "Alice spent 450 on Taxi"
            this.parseMultipleExpenses.bind(this),  // "Alice paid 200 for Lunch and 50 for Coffee"
        ];

        for (const pattern of patterns) {
            const result = pattern(text);
            if (result) {
                return result;
            }
        }

        return null; // No pattern matched
    }

    // Pattern 1: "Alice paid 500 for Dinner"
    parseStandardPaid(text) {
        const regex = /(.+?)\s+paid\s+(\d+(?:\.\d+)?)\s+(?:for|on)\s+(.+)/i;
        const match = text.match(regex);

        if (match) {
            const [, name, amount, description] = match;
            const payer = this.findParticipant(name);
            const date = this.extractDate(text);

            if (payer) {
                return {
                    description: this.cleanDescription(description),
                    amount: parseFloat(amount),
                    payer: payer,
                    date: date
                };
            }
        }
        return null;
    }

    // Pattern 2: "Split 600 for Lunch"
    parseSplitPattern(text) {
        const regex = /split\s+(\d+(?:\.\d+)?)\s+(?:for|on)\s+(.+)/i;
        const match = text.match(regex);

        if (match) {
            const [, amount, description] = match;
            const date = this.extractDate(text);

            // Default to first participant or current user
            return {
                description: this.cleanDescription(description),
                amount: parseFloat(amount),
                payer: this.participants[0], // Will be prompted to select
                date: date,
                splitEqual: true
            };
        }
        return null;
    }

    // Pattern 3: "500 for Dinner split among Alice, Bob"
    parseAmongPattern(text) {
        const regex = /(\d+(?:\.\d+)?)\s+for\s+(.+?)\s+(?:split|among|between)\s+(.+)/i;
        const match = text.match(regex);

        if (match) {
            const [, amount, description, participantNames] = match;
            const selectedParticipants = this.extractParticipants(participantNames);
            const date = this.extractDate(text);

            return {
                description: this.cleanDescription(description),
                amount: parseFloat(amount),
                payer: selectedParticipants[0] || this.participants[0],
                date: date,
                selectedParticipants: selectedParticipants.map(p => p.user || p._id)
            };
        }
        return null;
    }

    // Pattern 4: "Alice and Bob shared 800 for Movie"
    parseSharedPattern(text) {
        const regex = /(.+?)\s+(?:and|&)\s+(.+?)\s+shared\s+(\d+(?:\.\d+)?)\s+for\s+(.+)/i;
        const match = text.match(regex);

        if (match) {
            const [, name1, name2, amount, description] = match;
            const participant1 = this.findParticipant(name1);
            const participant2 = this.findParticipant(name2);
            const date = this.extractDate(text);

            if (participant1 && participant2) {
                return {
                    description: this.cleanDescription(description),
                    amount: parseFloat(amount),
                    payer: participant1,
                    date: date,
                    selectedParticipants: [participant1.user || participant1._id, participant2.user || participant2._id]
                };
            }
        }
        return null;
    }

    // Pattern 5: "Alice bought Groceries for 1200"
    parseBoughtPattern(text) {
        const regex = /(.+?)\s+bought\s+(.+?)\s+for\s+(\d+(?:\.\d+)?)/i;
        const match = text.match(regex);

        if (match) {
            const [, name, description, amount] = match;
            const payer = this.findParticipant(name);
            const date = this.extractDate(text);

            if (payer) {
                return {
                    description: this.cleanDescription(description),
                    amount: parseFloat(amount),
                    payer: payer,
                    date: date
                };
            }
        }
        return null;
    }

    // Pattern 6: "Alice spent 450 on Taxi"
    parseSpentPattern(text) {
        const regex = /(.+?)\s+spent\s+(\d+(?:\.\d+)?)\s+on\s+(.+)/i;
        const match = text.match(regex);

        if (match) {
            const [, name, amount, description] = match;
            const payer = this.findParticipant(name);
            const date = this.extractDate(text);

            if (payer) {
                return {
                    description: this.cleanDescription(description),
                    amount: parseFloat(amount),
                    payer: payer,
                    date: date
                };
            }
        }
        return null;
    }

    // Pattern 7: Multiple expenses - "Alice paid 200 for Lunch and 50 for Coffee"
    parseMultipleExpenses(text) {
        const regex = /(.+?)\s+paid\s+(\d+(?:\.\d+)?)\s+for\s+(.+?)\s+and\s+(\d+(?:\.\d+)?)\s+for\s+(.+)/i;
        const match = text.match(regex);

        if (match) {
            const [, name, amount1, desc1, amount2, desc2] = match;
            const payer = this.findParticipant(name);
            const date = this.extractDate(text);

            if (payer) {
                // Return first expense with a note about the second
                return {
                    description: this.cleanDescription(desc1),
                    amount: parseFloat(amount1),
                    payer: payer,
                    date: date,
                    multipleExpenses: {
                        second: {
                            description: this.cleanDescription(desc2),
                            amount: parseFloat(amount2)
                        }
                    }
                };
            }
        }
        return null;
    }

    // Helper: Find participant by name (fuzzy matching)
    findParticipant(name) {
        const cleanName = name.trim().toLowerCase();
        return this.participants.find(p =>
            p.name.toLowerCase().includes(cleanName) ||
            cleanName.includes(p.name.toLowerCase())
        );
    }

    // Helper: Extract multiple participants from comma-separated names
    extractParticipants(names) {
        const nameList = names.split(/[,&]|\s+and\s+/).map(n => n.trim());
        return nameList.map(name => this.findParticipant(name)).filter(Boolean);
    }

    // Helper: Clean description (remove date references)
    cleanDescription(description) {
        return description
            .replace(/\b(yesterday|today|tomorrow)\b/gi, '')
            .replace(/\bon\s+\d{1,2}[/-]\d{1,2}\b/gi, '')
            .trim();
    }

    // Helper: Extract date from text
    extractDate(text) {
        const now = new Date();
        const lowerText = text.toLowerCase();

        // Today
        if (lowerText.includes('today')) {
            return now;
        }

        // Yesterday
        if (lowerText.includes('yesterday')) {
            const date = new Date(now);
            date.setDate(date.getDate() - 1);
            return date;
        }

        // Tomorrow
        if (lowerText.includes('tomorrow')) {
            const date = new Date(now);
            date.setDate(date.getDate() + 1);
            return date;
        }

        // Last week
        if (lowerText.includes('last week')) {
            const date = new Date(now);
            date.setDate(date.getDate() - 7);
            return date;
        }

        // Specific date: "on 25/1" or "on 25-1"
        const dateMatch = text.match(/on\s+(\d{1,2})[/-](\d{1,2})/i);
        if (dateMatch) {
            const [, day, month] = dateMatch;
            const date = new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day));
            return date;
        }

        // Day of week
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < days.length; i++) {
            if (lowerText.includes(days[i])) {
                const date = new Date(now);
                const currentDay = date.getDay();
                const targetDay = i;
                const diff = targetDay - currentDay - (targetDay >= currentDay ? 0 : 7);
                date.setDate(date.getDate() + diff);
                return date;
            }
        }

        return now; // Default to today
    }
}
