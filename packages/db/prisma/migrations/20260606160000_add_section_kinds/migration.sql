-- AlterEnum: add front/back-matter section kinds
ALTER TYPE "ChapterKind" ADD VALUE 'FOREWORD';
ALTER TYPE "ChapterKind" ADD VALUE 'PREFACE';
ALTER TYPE "ChapterKind" ADD VALUE 'EPILOGUE';
ALTER TYPE "ChapterKind" ADD VALUE 'AFTERWORD';
ALTER TYPE "ChapterKind" ADD VALUE 'APPENDIX';
