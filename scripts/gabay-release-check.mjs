#!/usr/bin/env node
import { assertGabayReleaseApproved } from './lib/gabay-release-approval.mjs';
console.log(JSON.stringify(assertGabayReleaseApproved(), null, 2));
