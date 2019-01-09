const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: fs.createReadStream('input.txt'),
    crlfDelay: Infinity
});

// customers can bet on a WIN, PLACE, or EXACTA
let state = {
    'W': {
        pool: 0,
        bets: [],
        commission: 0.15,
        winningInvestment: 0,
        dividendPool: 0,
        dividend: 0
    },
    'P': {
        pool: 0,
        bets: [],
        commission: 0.12,
        winningInvestments: {},
        dividendPool: 0,
        dividend: {}
    },
    'E': {
        pool: 0,
        bets: [],
        commission: 0.18,
        winningInvestment: 0,
        dividendPool: 0,
        dividend: 0
    },
    result: []
};

// process each line, and store data in state, with a cumulative pool total
rl.on('line', (line) => {
    const [ event, ...rest ] = line.split(':');
    if (event === 'Bet') {
        const [ product, selection, stake ] = rest;
        state[product].bets.push({ selection, stake });
        state[product].pool += +stake;
    }

    if (event === 'Result') {
        state.result = rest;
    }
});

// once all lines are processed, loop through each product to calculate winning dividends and stdout.print them
rl.on('close', function() {
    for (let i = 0; i < Object.keys(state).length; i += 1) {
        const productName = Object.keys(state)[i];
        const product = state[productName];
        if (productName === 'W' || productName === 'E') {
            product.dividendPool = product.pool * (1 - product.commission);
            for (let j = 0; j < product.bets.length; j += 1) {
                const bet = product.bets[j];
                
                // for WIN product, exact match produces a win
                if (productName === 'W') {
                    if (bet.selection === state.result[0]) {
                        product.winningInvestment += +bet.stake;
                    }
                } else {
                    // for EXACTA product, a match on 1st and 2nd in the correct order produces a win
                    const [ first, second ] = bet.selection.split(',');
                    if (state.result[0] === first && state.result[1] === second) {
                        product.winningInvestment += +bet.stake;
                    }
                }

            }

            if (productName === 'W') {
                product.winningBet = state.result[0];
            } else {
                product.winningBet = `${state.result[0]},${state.result[1]}`;
            }
            product.dividend = `$${(product.dividendPool / product.winningInvestment).toFixed(2)}`;
            process.stdout.write(`${productName}:${product.winningBet}:${product.dividend}`);
            process.stdout.write('\n');
        }
    
        if (productName === 'P') {
            product.dividendPool = (product.pool * (1 - product.commission))/3;
            for (let j = 0; j < product.bets.length; j += 1) {
                const bet = product.bets[j];

                if (state.result.includes(bet.selection)) {
                    // for PLACE product, each place bet has its own winning pool
                    if (product.winningInvestments[bet.selection]) {
                        product.winningInvestments[bet.selection] += +bet.stake;
                    } else {
                        product.winningInvestments[bet.selection] = +bet.stake;
                    }
                }
            }

            for (let i = 0; i < Object.keys(product.winningInvestments).length; i += 1) {
                const ordered = Object.keys(product.winningInvestments).sort((a, b) => {
                    return state.result.indexOf(a) > state.result.indexOf(b);
                });
                const winner = ordered[i];
                const winningInvestment = product.winningInvestments[winner];
                product.dividend[winner] = `$${(product.dividendPool / winningInvestment).toFixed(2)}`;
                process.stdout.write(`${productName}:${winner}:${product.dividend[winner]}`);
                process.stdout.write('\n');
            }
        }        
    }
    process.exit(0);
});

