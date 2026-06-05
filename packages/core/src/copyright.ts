import { BookGenre } from './book';

export interface CopyrightInput {
  title: string;
  author?: string;
  year?: number;
  genre?: BookGenre;
}

export interface CopyrightContent {
  copyrightLine: string;
  rightsLine: string;
  /** Genre-specific disclaimer paragraph (may be empty). */
  disclaimer: string;
}

const RIGHTS =
  'All rights reserved. No part of this publication may be reproduced, distributed, ' +
  'or transmitted in any form or by any means without the prior written permission of ' +
  'the publisher, except in the case of brief quotations embodied in reviews and certain ' +
  'other noncommercial uses permitted by copyright law.';

const DISCLAIMERS: Record<BookGenre, string> = {
  fiction:
    'This is a work of fiction. Names, characters, places, and incidents are products of ' +
    "the author's imagination or are used fictitiously. Any resemblance to actual persons, " +
    'living or dead, events, or locales is entirely coincidental.',
  nonfiction:
    'The information in this book is provided for general informational purposes. While ' +
    'every effort has been made to ensure its accuracy, the author and publisher assume no ' +
    'responsibility for errors, omissions, or contrary interpretation of the subject matter.',
  selfhelp:
    'The content of this book is for informational and educational purposes only and is not ' +
    'intended as a substitute for professional advice. Always consult a qualified professional ' +
    'before acting on any information herein. The author and publisher disclaim any liability ' +
    'arising directly or indirectly from the use of this book.',
  poetry: 'This collection is a work of the author. Any resemblance to actual events or persons is coincidental.',
  childrens: '',
};

/**
 * Generate a complete copyright + disclaimer for a genre. The caller adds the
 * "Published by", ISBN, and watermark lines around this content.
 */
export function generateCopyright(input: CopyrightInput): CopyrightContent {
  const year = input.year ?? new Date().getFullYear();
  const holder = input.author ?? input.title;
  const genre = input.genre ?? BookGenre.FICTION;
  return {
    copyrightLine: `Copyright © ${year} ${holder}`.trim(),
    rightsLine: RIGHTS,
    disclaimer: DISCLAIMERS[genre],
  };
}
