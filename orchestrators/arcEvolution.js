function getArcEvolution() {
    const state = {
        arc: 'steady presence',
        theme: 'grounded reflection',
        turnsInArc: 0,
        tensionCount: 0
    };

    return {
        updateArcState(messageAnalysis = {}, tensionCount = 0, noveltyScore = 0.5) {
            state.turnsInArc += 1;
            state.tensionCount = tensionCount;

            if (noveltyScore > 0.7) {
                state.arc = 'new spark';
            } else if (tensionCount > 1) {
                state.arc = 'working the knot';
            } else {
                state.arc = 'steady presence';
            }

            return { ...state };
        },
        getCurrentArcState() {
            return { ...state };
        },
        getArcProgressionSummary() {
            return {
                arc: state.arc,
                theme: state.theme,
                turnsInArc: state.turnsInArc,
                tensionCount: state.tensionCount
            };
        },
        getCurrentState() {
            return { ...state };
        }
    };
}

module.exports = { getArcEvolution };
