# Режимы поискового запроса

- **simple**: система разбивает запрос на термы, добавляет PubMed field tag (например, `[ti]`, `[tiab]`) к каждому терму/фразе, сохраняет булевы операторы AND/OR/NOT.
- **advanced**: запрос не модифицируется (кроме нормализации пробелов); используйте для сложных булевых выражений.

Предупреждения линтера:

- незакрытые кавычки или скобки;
- использование field tag в составе сложного запроса может отключить ATM PubMed.

Примеры:

- simple + tiab: `( "heart failure" AND diabetes )` → `"heart failure"[tiab] AND diabetes[tiab]`
- simple + ti: `covid-19 vaccine children` → `covid-19[ti] vaccine[ti] children[ti]`
- advanced: `("heart failure" OR cardiomyopathy) AND (randomized[pt] OR review[pt])`
